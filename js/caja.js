/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   CAJA.JS - Punto de venta: venta libre, catálogo y carrito
   ========================================================== */

import { guardarVentaFirebase, actualizarDeudaClienteFirebase } from "./firebase.js";
import { state, catalogoProductos } from "./state.js";

// CAMBIO DE MODO EN POS (Entrada libre / Catálogo)
window.cambiarModoPOS = function(modo) {
    const panelLibre = document.getElementById("modo-libre");
    const panelCatalogo = document.getElementById("modo-catalogo");
    const btnLibre = document.getElementById("tab-btn-libre");
    const btnCatalogo = document.getElementById("tab-btn-catalogo");

    const esLibre = (modo === 'libre');
    const esCatalogo = (modo === 'catalogo');

    if (panelLibre) {
        panelLibre.classList.toggle("hidden", !esLibre);
        panelLibre.classList.toggle("active", esLibre);
    }
    if (panelCatalogo) {
        panelCatalogo.classList.toggle("hidden", !esCatalogo);
        panelCatalogo.classList.toggle("active", esCatalogo);
    }
    if (btnLibre) btnLibre.classList.toggle("active", esLibre);
    if (btnCatalogo) btnCatalogo.classList.toggle("active", esCatalogo);
};

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
    const index = state.carrito.findIndex(i => i.descripcion === descripcion && i.precioUnitario === precioUnitario);

    if (index > -1) {
        state.carrito[index].cantidad += cantidad;
        state.carrito[index].subtotal = state.carrito[index].cantidad * precioUnitario;
    } else {
        state.carrito.push({
            descripcion,
            precioUnitario,
            cantidad,
            subtotal: precioUnitario * cantidad
        });
    }
    renderizarCarrito();
}

// RENDERIZAR CARRITO
window.renderizarCarrito = function() {
    const contenedor = document.getElementById("cart-items-container");
    if (!contenedor) return;

    if (state.carrito.length === 0) {
        contenedor.innerHTML = `<p class="empty-cart-msg">No hay productos en la orden.</p>`;
        actualizarTotalesCarrito();
        return;
    }

    contenedor.innerHTML = "";
    state.carrito.forEach((item, idx) => {
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
};

window.eliminarItemCarrito = function(index) {
    state.carrito.splice(index, 1);
    renderizarCarrito();
};

window.vaciarCarrito = function() {
    state.carrito.length = 0;
    renderizarCarrito();
};

// ACTUALIZAR TOTALES CARRITO
window.actualizarTotalesCarrito = function() {
    const totalUSD = state.carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const totalBs = totalUSD * state.tasa;

    const elTotalUsd = document.getElementById("total-usd");
    const elTotalBs = document.getElementById("total-bs");

    if (elTotalUsd) elTotalUsd.innerText = `$${totalUSD.toFixed(2)}`;
    if (elTotalBs) elTotalBs.innerText = `${totalBs.toFixed(2)} Bs.`;
};

// EVALUAR MÉTODO DE PAGO
window.evaluarMetodoPago = function() {
    const metodo = document.getElementById("select-metodo-pago").value;
    const groupCliente = document.getElementById("group-cliente-credito");
    if (groupCliente) groupCliente.classList.toggle("hidden", metodo !== "Crédito");
};

// PROCESAR VENTA EN FIREBASE
window.procesarVenta = async function() {
    if (state.carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const totalUSD = state.carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const totalBs = totalUSD * state.tasa;
    const metodo = document.getElementById("select-metodo-pago").value;
    let clienteId = null;

    if (metodo === "Crédito") {
        clienteId = document.getElementById("select-cliente-credito").value;
        if (!clienteId) {
            alert("Debe seleccionar un cliente para otorgar el crédito.");
            return;
        }
        const cli = state.clientes.find(c => c.id === clienteId);
        if (cli) {
            const nuevaDeuda = (cli.deudaUSD || 0) + totalUSD;
            await actualizarDeudaClienteFirebase(clienteId, nuevaDeuda);
        }
    }

    const nuevaVenta = {
        items: [...state.carrito],
        totalUSD,
        totalBs,
        tasaAplicada: state.tasa,
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