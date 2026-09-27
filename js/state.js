/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   STATE.JS - Estado global de la aplicación
   ========================================================== */

export const state = {
    tasa: 36.50,
    carrito: [],
    ventas: [],
    clientes: [],
    // Variable global para ventas del día (se reinicia a medianoche)
    ventasDelDia: [],
    fechaUltimoReinicio: new Date().toDateString()
};

// Catálogo de productos predefinidos
export const catalogoProductos = [
    { nombre: "Pan Salado", precioDetal: 1.60, precioMayor: 1.00 },
    { nombre: "Pan Dulce", precioDetal: 1.60, precioMayor: 1.00 },
    { nombre: "Acema", precioDetal: 0.90, precioMayor: 0.50 },
    { nombre: "Palitos de Palmerita", precioDetal: 0.90, precioMayor: 0.40 },
    { nombre: "Torta (Trozo)", precioDetal: 0.90, precioMayor: 0.50 },
    { nombre: "Cannolo", precioDetal: 0.90, precioMayor: 0.50 },
    { nombre: "Palmeritas", precioDetal: 0.90, precioMayor: 0.55 },
    { nombre: "Galleta", precioDetal: 0.0, precioMayor: 0.0 }
];