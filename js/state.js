/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   STATE.JS - Estado global de la aplicación
   ========================================================== */

export const state = {
    tasa: 0.00,
    carrito: [],
    ventas: [],
    clientes: [],
    // Variable global para ventas del día (se reinicia a medianoche)
    ventasDelDia: [],
    fechaUltimoReinicio: new Date().toDateString()
};

export function fechaVentaADate(fecha) {
    if (fecha instanceof Date) return Number.isNaN(fecha.getTime()) ? null : fecha;
    if (fecha?.toDate) return fecha.toDate();
    if (typeof fecha === "string" || typeof fecha === "number") {
        const fechaConvertida = new Date(fecha);
        return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
    }
    return null;
}

// Catálogo de productos predefinidos
export const catalogoProductos = [
    { nombre: "Pan Salado", precioDetal: 1.60, precioMayor: 1.00 },
    { nombre: "Pan Dulce", precioDetal: 1.60, precioMayor: 1.00 },
    { nombre: "Acema", precioDetal: 1.00, precioMayor: 0.50 },
    { nombre: "Palitos de Palmerita", precioDetal: 0.95, precioMayor: 0.40 },
    { nombre: "Torta (Trozo)", precioDetal: 1.10, precioMayor: 0.50 },
    { nombre: "Cannolo", precioDetal: 1.00, precioMayor: 0.50 },
    { nombre: "Palmeritas", precioDetal: 1.00, precioMayor: 0.55 },
    { nombre: "Corbatas", precioDetal: 0.30, precioMayor: 0.18 },
];