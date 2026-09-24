/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   CREDITOS.JS - Clientes, deudas y abonos
   ========================================================== */

import { guardarClienteFirebase, actualizarDeudaClienteFirebase } from "./firebase.js";
import { state } from "./state.js";

// CREAR CLIENTE
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

// ACTUALIZAR SELECT DE CLIENTES (para créditos en POS)
window.actualizarSelectClientes = function() {
    const select = document.getElementById("select-cliente-credito");
    if (!select) return;
    select.innerHTML = `<option value="">-- Seleccionar Cliente --</option>`;
    state.clientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
};

// RENDERIZAR TABLA DE CLIENTES
window.renderizarTablaClientes = function() {
    const tbody = document.getElementById("tabla-clientes-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    state.clientes.forEach(c => {
        const deudaUSD = c.deudaUSD || 0;
        const deudaBs = deudaUSD * state.tasa;
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
};

// ABONAR DEUDA
window.abonarDeuda = async function(clienteId) {
    const cli = state.clientes.find(c => c.id === clienteId);
    if (!cli) return;

    const monto = parseFloat(prompt(`Deuda actual: $${(cli.deudaUSD || 0).toFixed(2)}. Ingrese monto a abonar ($):`));
    if (monto && monto > 0) {
        const nuevaDeuda = Math.max(0, (cli.deudaUSD || 0) - monto);
        await actualizarDeudaClienteFirebase(clienteId, nuevaDeuda);
        alert("Abono registrado.");
    }
};