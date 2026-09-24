/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS (LÓGICA PRINCIPAL)
   ========================================================== */

import { 
    guardarVentaFirebase, 
    escucharVentas, 
    anularVentaFirebase,
    guardarClienteFirebase, 
    escucharClientes, 
    actualizarDeudaClienteFirebase 
} from "./firebase.js";

// --- ESTADO GLOBAL ---
let tasa = 36.50;
let carrito = [];
let ventas = [];
let clientes = [];

// Catálogo base de Panadería y Repostería
const catalogoProductos = [
    { id: 101, nombre: "Pan Salado", precioDetal: 1.60, precioMayor: 1.00 },
    { id: 102, nombre: "Pan Dulce", precioDetal: 1.60, precioMayor: 1.00 },
    { id: 103, nombre: "Acema", precioDetal: 1.00, precioMayor: 0.50 },
    { id: 104, nombre: "Torta (Trozo)", precioDetal: 0.90, precioMayor: 0.50 },
    { id: 105, nombre: "Cannolo", precioDetal: 0.90, precioMayor: 0.50 },
    { id: 106, nombre: "Palitos Palmeritas", precioDetal: 0.90, precioMayor: 0.40 },
    { id: 107, nombre: "Palmeritas", precioDetal: 0.90, precioMayor: 0.55 }
];

//FUNCION PARA EL DOLAR AUTOMATICO
const dolar = document.getElementById('dolar')
let valorDolar;

async function actualizarDolar() {
  const url = 'https://ve.dolarapi.com/v1/dolares/oficial';
  
  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    
    // El valor está en datos.promedio
    valorDolar = datos.promedio.toFixed(2);

    if (dolar){
      dolar.textContent = `${valorDolar} Bs.`;
    }
    
    tasa = valorDolar;

  } catch (error) {
    console.error('Error al obtener el dólar:', error);
    document.getElementById('dolar').textContent = '000.00 bs';
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    actualizarTasa();
    actualizarDolar();
    renderizarCatalogo();

    // Escuchar Ventas desde Firebase en tiempo real
    escucharVentas((datosVentas) => {
        ventas = datosVentas;
        renderizarTablaVentas();
        calcularMetricasReportes();
    });

    // Escuchar Clientes desde Firebase en tiempo real
    escucharClientes((datosClientes) => {
        clientes = datosClientes;
        actualizarSelectClientes();
        renderizarTablaClientes();
        calcularMetricasReportes();
    });
    
    // Listener para cambio de Tasa
    const inputTasa = document.getElementById("input-tasa");
    if (inputTasa) {
        inputTasa.addEventListener("change", (e) => {
            tasa = parseFloat(e.target.value) || 1;
            const elTasaMobile = document.getElementById("dolar");
            if (elTasaMobile) elTasaMobile.innerText = tasa.toFixed(2);
            actualizarTotalesCarrito();
            renderizarTablaClientes();
        });
    }
});

/* ==========================================================
   EXPORTAR FUNCIONES AL ÁMBITO GLOBAL (WINDOW)
   Permite que los atributos onclick, onsubmit, etc. de HTML funcionen.
   ========================================================== */

// NAVEGACIÓN ENTRE SECCIONES
window.navegarA = function(secId, btnElement) {
    document.querySelectorAll(".app-section").forEach(sec => sec.classList.add("hidden"));
    const targetSection = document.getElementById(secId);
    if (targetSection) targetSection.classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    if (secId === 'sec-ventas') renderizarTablaVentas();
    if (secId === 'sec-creditos') renderizarTablaClientes();
    if (secId === 'sec-reportes') calcularMetricasReportes();
};

// CAMBIO DE MODO EN POS (Entrada libre / Catálogo)
window.cambiarModoPOS = function(modo) {
    document.getElementById("modo-libre")?.classList.toggle("hidden", modo !== 'libre');
    document.getElementById("modo-catalogo")?.classList.toggle("hidden", modo !== 'catalogo');
    
    document.getElementById("tab-btn-libre")?.classList.toggle("active", modo === 'libre');
    document.getElementById("tab-btn-catalogo")?.classList.toggle("active", modo === 'catalogo');
};

// ACTUALIZAR TASA DE CAMBIO
function actualizarTasa() {
    const input = document.getElementById("input-tasa");
    if (input) tasa = parseFloat(input.value);
}

// RENDERIZAR CATÁLOGO
window.renderizarCatalogo = function() {
    const contenedor = document.getElementById("catalogo-grid-container");
    if (!contenedor) return;

    const radioChecked = document.querySelector('input[name="tipoPrecio"]:checked');
    const tipoPrecio = radioChecked ? radioChecked.value : 'detal';
    contenedor.innerHTML = "";

    catalogoProductos.forEach(p => {
        const precio = tipoPrecio === 'detal' ? p.precioDetal : p.precioMayor;
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => agregarAlCarrito(p.nombre, precio, 1);
        card.innerHTML = `
            <h4>${p.nombre}</h4>
            <div class="price">$${precio.toFixed(2)}</div>
        `;
        contenedor.appendChild(card);
    });
};

// AGREGAR ITEM EN VENTA LIBRE
window.agregarItemLibre = function(e) {
    e.preventDefault();
    const desc = document.getElementById("libre-descripcion").value;
    const precio = parseFloat(document.getElementById("libre-precio").value);
    const cant = parseInt(document.getElementById("libre-cantidad").value);

    agregarAlCarrito(desc, precio, cant);
    document.getElementById("form-venta-libre").reset();
};

// AGREGAR AL CARRITO (GENERAL)
function agregarAlCarrito(descripcion, precioUnitario, cantidad) {
    const index = carrito.findIndex(i => i.descripcion === descripcion && i.precioUnitario === precioUnitario);
    
    if (index > -1) {
        carrito[index].cantidad += cantidad;
        carrito[index].subtotal = carrito[index].cantidad * precioUnitario;
    } else {
        carrito.push({
            descripcion,
            precioUnitario,
            cantidad,
            subtotal: precioUnitario * cantidad
        });
    }
    renderizarCarrito();
}

// RENDERIZAR CARRITO
function renderizarCarrito() {
    const contenedor = document.getElementById("cart-items-container");
    if (!contenedor) return;
    
    if (carrito.length === 0) {
        contenedor.innerHTML = `<p class="empty-cart-msg">No hay productos en la orden.</p>`;
        actualizarTotalesCarrito();
        return;
    }

    contenedor.innerHTML = "";
    carrito.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div>
                <strong>${item.descripcion}</strong><br>
                <small>${item.cantidad} x $${item.precioUnitario.toFixed(2)}</small>
            </div>
            <div>
                <strong>$${item.subtotal.toFixed(2)}</strong>
                <button onclick="eliminarItemCarrito(${idx})" style="border:none; background:transparent; color:red; margin-left:8px; cursor:pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
        contenedor.appendChild(div);
    });

    actualizarTotalesCarrito();
}

window.eliminarItemCarrito = function(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
};

window.vaciarCarrito = function() {
    carrito = [];
    renderizarCarrito();
};

// ACTUALIZAR TOTALES CARRITO
function actualizarTotalesCarrito() {
    const totalUSD = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const totalBs = totalUSD * tasa;

    const elTotalUsd = document.getElementById("total-usd");
    const elTotalBs = document.getElementById("total-bs");

    if (elTotalUsd) elTotalUsd.innerText = `$${totalUSD.toFixed(2)}`;
    if (elTotalBs) elTotalBs.innerText = `${totalBs.toFixed(2)} Bs.`;
}

// EVALUAR MÉTODO DE PAGO
window.evaluarMetodoPago = function() {
    const metodo = document.getElementById("select-metodo-pago").value;
    const groupCliente = document.getElementById("group-cliente-credito");
    if (groupCliente) groupCliente.classList.toggle("hidden", metodo !== "Crédito");
};

// PROCESAR VENTA EN FIREBASE
window.procesarVenta = async function() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const totalUSD = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const totalBs = totalUSD * tasa;
    const metodo = document.getElementById("select-metodo-pago").value;
    let clienteId = null;

    if (metodo === "Crédito") {
        clienteId = document.getElementById("select-cliente-credito").value;
        if (!clienteId) {
            alert("Debe seleccionar un cliente para otorgar el crédito.");
            return;
        }
        // Cargar deuda al cliente en Firebase
        const cli = clientes.find(c => c.id === clienteId);
        if (cli) {
            const nuevaDeuda = (cli.deudaUSD || 0) + totalUSD;
            await actualizarDeudaClienteFirebase(clienteId, nuevaDeuda);
        }
    }

    const nuevaVenta = {
        items: [...carrito],
        totalUSD,
        totalBs,
        tasaAplicada: tasa,
        metodo,
        clienteId: clienteId || null,
        estado: "Completada"
    };

    try {
        await guardarVentaFirebase(nuevaVenta);
        alert("¡Venta registrada con éxito!");
        vaciarCarrito();
    } catch (e) {
        alert("Error al guardar la venta en Firebase.");
    }
};

// RENDERIZAR TABLA DE VENTAS
function renderizarTablaVentas() {
    const tbody = document.getElementById("tabla-ventas-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    ventas.forEach(v => {
        const tr = document.createElement("tr");
        const fechaObj = v.fecha?.toDate ? v.fecha.toDate() : new Date();
        const hora = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const detalle = v.items ? v.items.map(i => `${i.cantidad}x ${i.descripcion}`).join(", ") : "-";

        tr.innerHTML = `
            <td>#${v.id.toString().slice(-4)}</td>
            <td>${hora}</td>
            <td><small>${detalle}</small></td>
            <td>${v.metodo}</td>
            <td><strong>$${(v.totalUSD || 0).toFixed(2)}</strong></td>
            <td>${(v.totalBs || 0).toFixed(2)} Bs.</td>
            <td><span style="color: ${v.estado==='Anulada'?'red':'green'}">${v.estado}</span></td>
            <td>
                ${v.estado === 'Completada' ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="anularVenta('${v.id}')">Anular</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ANULAR VENTA EN FIREBASE
window.anularVenta = async function(id) {
    if (!confirm("¿Está seguro de anular esta venta?")) return;

    const venta = ventas.find(v => v.id === id);
    if (venta) {
        try {
            await anularVentaFirebase(id);
            if (venta.metodo === "Crédito" && venta.clienteId) {
                const cli = clientes.find(c => c.id === venta.clienteId);
                if (cli) {
                    const nuevaDeuda = Math.max(0, (cli.deudaUSD || 0) - venta.totalUSD);
                    await actualizarDeudaClienteFirebase(venta.clienteId, nuevaDeuda);
                }
            }
            alert("Venta anulada con éxito.");
        } catch (e) {
            alert("Error al anular la venta.");
        }
    }
};

// CLIENTES Y CRÉDITOS
window.crearCliente = async function(e) {
    e.preventDefault();
    const nombre = document.getElementById("cliente-nombre").value;
    const telefono = document.getElementById("cliente-telefono").value;

    try {
        await guardarClienteFirebase({ nombre, telefono });
        document.getElementById("form-nuevo-cliente").reset();
        alert("Cliente registrado correctamente.");
    } catch (e) {
        alert("Error al crear el cliente.");
    }
};

function actualizarSelectClientes() {
    const select = document.getElementById("select-cliente-credito");
    if (!select) return;
    select.innerHTML = `<option value="">-- Seleccionar Cliente --</option>`;
    clientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

function renderizarTablaClientes() {
    const tbody = document.getElementById("tabla-clientes-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    clientes.forEach(c => {
        const deudaUSD = c.deudaUSD || 0;
        const deudaBs = deudaUSD * tasa;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${c.id.toString().slice(-4)}</td>
            <td>${c.nombre}</td>
            <td>${c.telefono}</td>
            <td><strong style="color:red">$${deudaUSD.toFixed(2)}</strong></td>
            <td>${deudaBs.toFixed(2)} Bs.</td>
            <td>
                ${deudaUSD > 0 ? `<button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="abonarDeuda('${c.id}')">Abonar</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abonarDeuda = async function(clienteId) {
    const cli = clientes.find(c => c.id === clienteId);
    if (!cli) return;

    const monto = parseFloat(prompt(`Deuda actual: $${(cli.deudaUSD || 0).toFixed(2)}. Ingrese monto a abonar ($):`));
    if (monto && monto > 0) {
        const nuevaDeuda = Math.max(0, (cli.deudaUSD || 0) - monto);
        await actualizarDeudaClienteFirebase(clienteId, nuevaDeuda);
        alert("Abono registrado.");
    }
};

// REPORTES Y CIERRE
function calcularMetricasReportes() {
    const ventasValidas = ventas.filter(v => v.estado === "Completada");
    
    const totalDia = ventasValidas.reduce((acc, v) => acc + (v.totalUSD || 0), 0);
    const totalCreditos = clientes.reduce((acc, c) => acc + (c.deudaUSD || 0), 0);

    const elDia = document.getElementById("m-ventas-dia");
    const elSem = document.getElementById("m-ventas-semana");
    const elMes = document.getElementById("m-ventas-mes");
    const elCred = document.getElementById("m-total-creditos");

    if (elDia) elDia.innerText = `$${totalDia.toFixed(2)}`;
    if (elSem) elSem.innerText = `$${totalDia.toFixed(2)}`;
    if (elMes) elMes.innerText = `$${totalDia.toFixed(2)}`;
    if (elCred) elCred.innerText = `$${totalCreditos.toFixed(2)}`;
}

window.imprimirReportePDF = function() {
    window.print();
};