/* ==========================================================
PANIFICADORA PACHOS - SISTEMA POS
APP.JS - Inicialización, dólar, navegación
========================================================== */

import { escucharVentas, escucharClientes } from "./firebase.js";
import { state } from "./state.js";

// Importar los módulos para que registren sus funciones en window
import "./caja.js";
import "./ventas.js";
import "./creditos.js";
import "./reportes.js";

// FUNCION PARA EL DOLAR AUTOMATICO
const dolar = document.getElementById('dolar');

async function actualizarDolar() {
    const url = 'https://ve.dolarapi.com/v1/dolares/oficial';
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        const valorDolar = datos.promedio.toFixed(2);
        if (dolar) {
            dolar.textContent = `${valorDolar} Bs.`;
        }
        state.tasa = parseFloat(valorDolar);
    } catch (error) {
        console.error('Error al obtener el dólar:', error);
        if (dolar) dolar.textContent = '000.00 bs';
    }
}

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

// FUNCIÓN PARA VERIFICAR Y REINICIAR VENTAS DEL DÍA A MEDIANOCHE
function verificarReinicioDiario() {
    const fechaActual = new Date().toDateString();
    if (state.fechaUltimoReinicio !== fechaActual) {
        // Es un nuevo día, reiniciar ventas del día
        state.ventasDelDia = [];
        state.fechaUltimoReinicio = fechaActual;
        console.log("Historial de ventas del día reiniciado automáticamente.");
        
        // Actualizar vistas si es necesario
        if (typeof renderizarTablaVentas === 'function') renderizarTablaVentas();
        if (typeof calcularMetricasReportes === 'function') calcularMetricasReportes();
    }
}

// Programar verificación a medianoche
function programarReinicioMedianoche() {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const msHastaMedianoche = manana.getTime() - ahora.getTime();
    
    setTimeout(() => {
        verificarReinicioDiario();
        // Reprogramar para la siguiente medianoche
        programarReinicioMedianoche();
    }, msHastaMedianoche);
    
    console.log(`Reinicio diario programado en ${Math.round(msHastaMedianoche / 1000 / 60)} minutos.`);
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("input-tasa");
    if (input) state.tasa = parseFloat(input.value) || 36.50;

    // Iniciar en modo Catálogo por defecto
    cambiarModoPOS('catalogo');

    actualizarDolar();
    renderizarCatalogo();

    // Verificar reinicio diario al cargar
    verificarReinicioDiario();
    programarReinicioMedianoche();

    // Escuchar Ventas desde Firebase en tiempo real
    escucharVentas((datosVentas) => {
        state.ventas = datosVentas;
        
        // Filtrar ventas del día actual
        const hoy = new Date().toDateString();
        state.ventasDelDia = datosVentas.filter(v => {
            if (!v.fecha) return false;
            const fechaVenta = v.fecha?.toDate ? v.fecha.toDate() : new Date();
            return fechaVenta.toDateString() === hoy;
        });
        
        renderizarTablaVentas();
        calcularMetricasReportes();
    });

    // Escuchar Clientes desde Firebase en tiempo real
    escucharClientes((datosClientes) => {
        state.clientes = datosClientes;
        actualizarSelectClientes();
        renderizarTablaClientes();
        calcularMetricasReportes();
    });

    // Listener para cambio de Tasa
    if (input) {
        input.addEventListener("change", (e) => {
            state.tasa = parseFloat(e.target.value) || 1;
            const elTasaMobile = document.getElementById("dolar");
            if (elTasaMobile) elTasaMobile.innerText = state.tasa.toFixed(2);
            actualizarTotalesCarrito();
            renderizarTablaClientes();
        });
    }
});