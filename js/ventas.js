/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   VENTAS.JS - Historial de ventas y anulación
   ========================================================== */

import { anularVentaFirebase, actualizarDeudaClienteFirebase } from "./firebase.js";
import { state } from "./state.js";

// RENDERIZAR TABLA DE VENTAS
window.renderizarTablaVentas = function() {
    const tbody = document.getElementById("tabla-ventas-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    state.ventas.forEach(v => {
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
};

// ANULAR VENTA EN FIREBASE
window.anularVenta = async function(id) {
    if (!confirm("¿Está seguro de anular esta venta?")) return;

    const venta = state.ventas.find(v => v.id === id);
    if (venta) {
        try {
            await anularVentaFirebase(id);
            if (venta.metodo === "Crédito" && venta.clienteId) {
                const cli = state.clientes.find(c => c.id === venta.clienteId);
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