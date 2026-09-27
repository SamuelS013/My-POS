/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   CREDITOS.JS - Clientes, deudas y abonos
   ========================================================== */

import { guardarClienteFirebase, actualizarDeudaClienteFirebase, guardarVentaFirebase } from "./firebase.js";
import { state } from "./state.js";

// CREAR CLIENTE (ID de 3 dígitos)
window.crearCliente = async function(e) {
    e.preventDefault();
    const nombre = document.getElementById("cliente-nombre").value;
    const telefono = document.getElementById("cliente-telefono").value;

    // Generar ID de 3 dígitos basado en timestamp
    const idCorto = String(Date.now()).slice(-3);

    try {
        await guardarClienteFirebase({ 
            nombre, 
            telefono,
            idCorto: idCorto
        });
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
        // Usar idCorto si existe, sino los últimos 3 dígitos del id de Firebase
        const idMostrar = c.idCorto || c.id.toString().slice(-3);
        select.innerHTML += `<option value="${c.id}">${c.nombre} (ID: ${idMostrar})</option>`;
    });
};

// RENDERIZAR TABLA DE CLIENTES (SIN ID de Firebase, usando ID corto de 3 dígitos)
window.renderizarTablaClientes = function() {
    const tbody = document.getElementById("tabla-clientes-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No hay clientes registrados.</td></tr>`;
        return;
    }

    state.clientes.forEach(c => {
        const deudaUSD = c.deudaUSD || 0;
        const deudaBs = deudaUSD * state.tasa;
        // Usar idCorto si existe, sino los últimos 3 dígitos del id de Firebase
        const idMostrar = c.idCorto || c.id.toString().slice(-3);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${idMostrar}</td>
            <td>${c.nombre}</td>
            <td>${c.telefono}</td>
            <td><strong style="color:${deudaUSD > 0 ? 'red' : 'green'}">$${deudaUSD.toFixed(2)}</strong></td>
            <td>${deudaBs.toFixed(2)} Bs.</td>
            <td>
                ${deudaUSD > 0 ? `<button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="abonarDeuda('${c.id}')">Abonar</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// ABONAR DEUDA (se registra como una venta más en el historial)
window.abonarDeuda = async function(clienteId) {
    const cli = state.clientes.find(c => c.id === clienteId);
    if (!cli) return;

    const monto = parseFloat(prompt(`Deuda actual: $${(cli.deudaUSD || 0).toFixed(2)}. Ingrese monto a abonar ($):`));
    
    if (monto && monto > 0) {
        const deudaActual = cli.deudaUSD || 0;
        const montoReal = Math.min(monto, deudaActual); // No abonar más de lo que debe
        const nuevaDeuda = Math.max(0, deudaActual - montoReal);

        try {
            // Actualizar deuda del cliente
            await actualizarDeudaClienteFirebase(clienteId, nuevaDeuda);

            // Registrar el abono como una venta en el historial
            const totalBs = montoReal * state.tasa;
            const nuevoAbono = {
                items: [],
                totalUSD: montoReal,
                totalBs: totalBs,
                tasaAplicada: state.tasa,
                metodo: "-",
                clienteId: clienteId,
                estado: "Completada",
                esAbono: true,
                descripcion: cli.nombre
            };

            await guardarVentaFirebase(nuevoAbono);

            alert(`Abono de $${montoReal.toFixed(2)} registrado correctamente.`);
        } catch (e) {
            console.error(e);
            alert("Error al registrar el abono.");
        }
    }
};