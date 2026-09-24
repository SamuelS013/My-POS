/* ==========================================================
   PANIFICADORA PACHOS - SISTEMA POS
   STATE.JS - Estado global compartido
   ========================================================== */

export const state = {
    tasa: 36.50,
    carrito: [],
    ventas: [],
    clientes: []
};

// Catálogo base de Panadería y Repostería
export const catalogoProductos = [
    { id: 101, nombre: "Pan Salado", precioDetal: 1.60, precioMayor: 1.00 },
    { id: 102, nombre: "Pan Dulce", precioDetal: 1.60, precioMayor: 1.00 },
    { id: 103, nombre: "Acema", precioDetal: 1.00, precioMayor: 0.50 },
    { id: 104, nombre: "Torta (Trozo)", precioDetal: 0.90, precioMayor: 0.50 },
    { id: 105, nombre: "Cannolo", precioDetal: 0.90, precioMayor: 0.50 },
    { id: 106, nombre: "Palitos Palmeritas", precioDetal: 0.90, precioMayor: 0.40 },
    { id: 107, nombre: "Palmeritas", precioDetal: 0.90, precioMayor: 0.55 }
];