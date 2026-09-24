/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   REPORTES.JS - Métricas y cierre de caja
   ========================================================== */

import { state } from "./state.js";

// REPORTES Y CIERRE
window.calcularMetricasReportes = function() {
    const ventasValidas = state.ventas.filter(v => v.estado === "Completada");

    const totalDia = ventasValidas.reduce((acc, v) => acc + (v.totalUSD || 0), 0);
    const totalCreditos = state.clientes.reduce((acc, c) => acc + (c.deudaUSD || 0), 0);

    const elDia = document.getElementById("m-ventas-dia");
    const elSem = document.getElementById("m-ventas-semana");
    const elMes = document.getElementById("m-ventas-mes");
    const elCred = document.getElementById("m-total-creditos");

    if (elDia) elDia.innerText = `$${totalDia.toFixed(2)}`;
    if (elSem) elSem.innerText = `$${totalDia.toFixed(2)}`;
    if (elMes) elMes.innerText = `$${totalDia.toFixed(2)}`;
    if (elCred) elCred.innerText = `$${totalCreditos.toFixed(2)}`;
};

window.imprimirReportePDF = function() {
    window.print();
};