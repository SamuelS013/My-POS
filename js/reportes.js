/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   REPORTES.JS - Métricas y cierre de caja
   ========================================================== */

import { state } from "./state.js";

// REPORTES Y CIERRE
window.calcularMetricasReportes = function() {
    // Filtrar ventas del día actual (excluyendo abonos para ventas diarias)
    const hoy = new Date().toDateString();
    
    const ventasDelDia = state.ventas.filter(v => {
        if (!v.fecha) return false;
        const fechaVenta = v.fecha?.toDate ? v.fecha.toDate() : new Date();
        return fechaVenta.toDateString() === hoy;
    });

    // Ventas diarias: solo ventas reales (no abonos, no créditos)
    const ventasRealesDelDia = ventasDelDia.filter(v => 
        v.estado === "Completada" && 
        !v.esAbono && 
        v.metodo !== "Crédito"
    );

    // Abonos del día (se suman al efectivo real)
    const abonosDelDia = ventasDelDia.filter(v => 
        v.estado === "Completada" && 
        v.esAbono
    );

    // Total de ventas del día (sin créditos, sin deudas)
    const totalVentasDia = ventasRealesDelDia.reduce((acc, v) => acc + (v.totalUSD || 0), 0);
    
    // Total de abonos del día (dinero que entra por pagos de deudas)
    const totalAbonosDia = abonosDelDia.reduce((acc, v) => acc + (v.totalUSD || 0), 0);

    // Para la métrica de "Ventas del Día" mostramos solo las ventas reales (sin deudas)
    // Los abonos se manejan aparte, pero el dinero real que entra es ventas + abonos
    const totalEfectivoDia = totalVentasDia + totalAbonosDia;

    // Total de créditos otorgados (deudas pendientes de cobro) - esto es lo que se debe
    const totalCreditos = state.clientes.reduce((acc, c) => acc + (c.deudaUSD || 0), 0);

    // Ventas semanales (últimos 7 días) - sin créditos ni abonos
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    
    const ventasSemana = state.ventas.filter(v => {
        if (!v.fecha || v.estado !== "Completada" || v.esAbono || v.metodo === "Crédito") return false;
        const fechaVenta = v.fecha?.toDate ? v.fecha.toDate() : new Date();
        return fechaVenta >= hace7Dias;
    }).reduce((acc, v) => acc + (v.totalUSD || 0), 0);

    // Ventas mensuales (últimos 30 días) - sin créditos ni abonos
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const ventasMes = state.ventas.filter(v => {
        if (!v.fecha || v.estado !== "Completada" || v.esAbono || v.metodo === "Crédito") return false;
        const fechaVenta = v.fecha?.toDate ? v.fecha.toDate() : new Date();
        return fechaVenta >= hace30Dias;
    }).reduce((acc, v) => acc + (v.totalUSD || 0), 0);

    const elDia = document.getElementById("m-ventas-dia");
    const elSem = document.getElementById("m-ventas-semana");
    const elMes = document.getElementById("m-ventas-mes");
    const elCred = document.getElementById("m-total-creditos");

    // Mostrar solo ventas reales del día (sin deudas)
    if (elDia) elDia.innerText = `$${totalVentasDia.toFixed(2)}`;
    if (elSem) elSem.innerText = `$${ventasSemana.toFixed(2)}`;
    if (elMes) elMes.innerText = `$${ventasMes.toFixed(2)}`;
    if (elCred) elCred.innerText = `$${totalCreditos.toFixed(2)}`;

    // Log para debugging
    console.log("Reportes:", {
        ventasRealesDelDia: totalVentasDia,
        abonosDelDia: totalAbonosDia,
        efectivoTotalDia: totalEfectivoDia,
        creditosPendientes: totalCreditos
    });
};

window.imprimirReportePDF = function() {
    window.print();
};