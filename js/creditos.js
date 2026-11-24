/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   CREDITOS.JS - Clientes, deudas y abonos
   ========================================================== */

import { guardarClienteFirebase, actualizarDeudaClienteFirebase } from "./firebase.js";
import { registrarVentaLocal } from "./ventas-locales.js";
import { state } from "./state.js";

const formularioNuevoCliente = () => document.getElementById("form-nuevo-cliente");
const modalNuevoCliente = () => document.querySelector(".nuevo-cliente-modal");

window.toggleNuevoClienteForm = function() {
    const modal = modalNuevoCliente();
    const formulario = formularioNuevoCliente();
    if (!modal || !formulario) return;

    const abrir = modal.classList.contains("hidden");
    modal.classList.toggle("hidden", !abrir);
    if (abrir) {
        document.getElementById("nuevo-cliente-nombre")?.focus();
    } else {
        formulario.reset();
    }
};

window.cerrarNuevoClienteAlFondo = function(event) {
    if (event.target === event.currentTarget) window.toggleNuevoClienteForm();
};

// CREAR CLIENTE (ID de 3 dígitos)
window.crearCliente = async function(e) {
    e.preventDefault();
    const nombre = document.getElementById("nuevo-cliente-nombre").value.trim();
    const telefono = document.getElementById("nuevo-cliente-telefono").value.trim();
    const formulario = formularioNuevoCliente();

    if (!nombre || !telefono) {
        formulario?.reportValidity();
        return;
    }
    // Generar ID de 3 dígitos basado en timestamp
    const idCorto = String(Date.now()).slice(-3);

    try {
        const promesaGuardado = guardarClienteFirebase({
            nombre, 
            telefono,
            idCorto: idCorto
        });
        if (!navigator.onLine) {
            formulario?.reset();
            modalNuevoCliente()?.classList.add("hidden");
            promesaGuardado.catch(error => {
                console.error("No se pudo sincronizar el cliente guardado sin conexión:", error);
                alert("No se pudo sincronizar el cliente. Revise la conexión e inténtelo de nuevo.");
            });
            alert("Cliente guardado en este dispositivo. Se sincronizará al recuperar internet.");
            return;
        }
        await promesaGuardado;
        formulario?.reset();
        modalNuevoCliente()?.classList.add("hidden");
        alert("Cliente registrado correctamente.");
    } catch (error) {
        console.error("No se pudo registrar el cliente:", error);
        alert("Error al crear el cliente. Revise la conexión e inténtelo de nuevo.");
    }
};

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modalNuevoCliente()?.classList.contains("hidden")) {
        window.toggleNuevoClienteForm();
    }
});

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
            // Registrar el abono como una venta en el historial
            const totalBs = montoReal * state.tasa;
            const nuevoAbono = {
                items: [],
                totalUSD: montoReal,
                totalBs: totalBs,
                tasaAplicada: state.tasa,
                metodo: "-",
                clienteId: clienteId,
                estado: "En espera",
                esAbono: true,
                descripcion: cli.nombre
            };

            const abono = await registrarVentaLocal(nuevoAbono);
            actualizarDeudaClienteFirebase(clienteId, nuevaDeuda).catch(error => {
                console.error("No se pudo sincronizar la deuda del cliente:", error);
                alert("El abono quedó guardado, pero no se pudo actualizar la deuda del cliente.");
            });
            alert(abono.estado === "Completada"
                ? `Abono de $${montoReal.toFixed(2)} registrado correctamente.`
                : "Abono guardado en este dispositivo. Estado: En espera. Se sincronizará al recuperar internet.");
        } catch (e) {
            console.error(e);
            alert("Error al registrar el abono.");
        }
    }
};