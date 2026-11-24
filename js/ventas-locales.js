import { guardarVentaFirebase } from "./firebase.js";
import { state, fechaVentaADate } from "./state.js";

const STORAGE_KEY = "my-pos-ventas-locales";
let ventasLocales = [];
let ventasRemotas = [];
let inicializado = false;
let sincronizando = false;
const sincronizacionesActivas = new Set();

function guardarEnDispositivo() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ventasLocales));
    } catch (error) {
        console.error("No se pudieron guardar las ventas en este dispositivo:", error);
        throw new Error("No se pudo guardar la venta localmente.", { cause: error });
    }
}

function actualizarVistas() {
    const ventasPorId = new Map();
    const remotasPorId = new Map(ventasRemotas.map(venta => [venta.id, venta]));

    for (const venta of ventasRemotas) {
        const { _pendienteServidor, ...ventaVisible } = venta;
        ventasPorId.set(venta.id, {
            ...ventaVisible,
            estado: _pendienteServidor && venta.estado === "Completada" ? "En espera" : venta.estado
        });
    }

    let cambioLocal = false;
    for (const ventaLocal of ventasLocales) {
        const ventaRemota = ventasPorId.get(ventaLocal.id);
        const datosRemotos = remotasPorId.get(ventaLocal.id);
        if (ventaRemota && !datosRemotos?._pendienteServidor &&
            ventaLocal.estado === "En espera") {
            ventaLocal.estado = ventaRemota.estado || "Completada";
            ventaLocal.sincronizada = true;
            cambioLocal = true;
        }

        ventasPorId.set(ventaLocal.id, ventaRemota
            ? {
                ...ventaLocal,
                ...ventaRemota,
                fecha: ventaRemota.fecha || ventaLocal.fecha,
                estado: ventaRemota.estado === "Anulada"
                    ? "Anulada"
                    : ventaLocal.estado === "Completada"
                        ? "Completada"
                        : datosRemotos?._pendienteServidor
                            ? "En espera"
                            : ventaRemota.estado
            }
            : ventaLocal);
    }

    if (cambioLocal) guardarEnDispositivo();

    state.ventas = [...ventasPorId.values()].sort((a, b) => {
        const fechaA = fechaVentaADate(a.fecha)?.getTime() || 0;
        const fechaB = fechaVentaADate(b.fecha)?.getTime() || 0;
        return fechaB - fechaA;
    });
    const hoy = new Date().toDateString();
    state.ventasDelDia = state.ventas.filter(venta =>
        fechaVentaADate(venta.fecha)?.toDateString() === hoy
    );

    if (typeof window.renderizarTablaVentas === "function") window.renderizarTablaVentas();
    if (typeof window.calcularMetricasReportes === "function") window.calcularMetricasReportes();
}

function asegurarInicializado() {
    if (!inicializado) inicializarVentasLocales();
}

function actualizarVentaLocal(ventaId, cambios) {
    const index = ventasLocales.findIndex(venta => venta.id === ventaId);
    if (index === -1) return;

    ventasLocales[index] = { ...ventasLocales[index], ...cambios };
    guardarEnDispositivo();
    actualizarVistas();
}

async function sincronizarVenta(venta) {
    if (!navigator.onLine || sincronizacionesActivas.has(venta.id)) return false;

    sincronizacionesActivas.add(venta.id);
    try {
        await guardarVentaFirebase(venta.id, venta);
        actualizarVentaLocal(venta.id, { estado: "Completada", sincronizada: true });
        return true;
    } catch (error) {
        console.error(`No se pudo sincronizar la venta ${venta.id}:`, error);
        return false;
    } finally {
        sincronizacionesActivas.delete(venta.id);
    }
}

export function inicializarVentasLocales() {
    try {
        const guardadas = localStorage.getItem(STORAGE_KEY);
        ventasLocales = guardadas ? JSON.parse(guardadas) : [];
        if (!Array.isArray(ventasLocales)) {
            throw new Error("El historial local de ventas tiene un formato inválido.");
        }
    } catch (error) {
        console.error("No se pudieron leer las ventas guardadas en este dispositivo:", error);
        throw new Error("No se pudieron cargar las ventas locales.", { cause: error });
    }

    inicializado = true;
    actualizarVistas();
}

export function actualizarVentasDesdeFirestore(ventas) {
    asegurarInicializado();
    ventasRemotas = ventas;
    actualizarVistas();
}

export async function registrarVentaLocal(datosVenta) {
    asegurarInicializado();
    const id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `venta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const venta = {
        ...datosVenta,
        id,
        fecha: new Date().toISOString(),
        estado: "En espera",
        sincronizada: false
    };

    ventasLocales.push(venta);
    try {
        guardarEnDispositivo();
    } catch (error) {
        ventasLocales.pop();
        throw error;
    }
    actualizarVistas();

    if (navigator.onLine) void sincronizarVenta(venta);
    return state.ventas.find(item => item.id === id) || venta;
}

export async function sincronizarVentasPendientes() {
    asegurarInicializado();
    if (!navigator.onLine || sincronizando) return;

    sincronizando = true;
    try {
        const pendientes = ventasLocales.filter(venta => venta.estado === "En espera");
        await Promise.all(pendientes.map(venta => sincronizarVenta(venta)));
    } finally {
        sincronizando = false;
    }
}
