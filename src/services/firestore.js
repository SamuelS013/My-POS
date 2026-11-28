import { db } from "../lib/firebase";
import { redondearMoneda } from "../utils/moneda";
import {
    collection,
    addDoc,
    doc, 
    onSnapshot,
    query,
    orderBy,
    runTransaction,
    serverTimestamp,
    writeBatch,
    increment,
} from "firebase/firestore";

const EVENTO_ERROR_ESCRITURA = "my-pos:queued-write-failed";

function verificarConexion(operacion) {
    if (!navigator.onLine) {
        throw new Error(`${operacion} requiere conexión a Internet.`);
    }
}

function notificarErrorEscritura(error, operacion) {
    console.error(`No se pudo sincronizar ${operacion}:`, error);
    window.dispatchEvent(new CustomEvent(EVENTO_ERROR_ESCRITURA, {
        detail: {
            message: `${operacion} no se pudo sincronizar. Verifica los datos y vuelve a registrarla.`,
        },
    }));
}

async function esperarEscrituraODesconexion(escritura, operacion) {
    const resultadoEscritura = escritura.then(
        () => ({ sincronizada: true }),
        (error) => ({ error }),
    );

    if (!navigator.onLine) {
        void resultadoEscritura.then((resultado) => {
            if (resultado.error) notificarErrorEscritura(resultado.error, operacion);
        });
        return { pendiente: true };
    }

    let retirarListener;
    const desconexion = new Promise((resolve) => {
        const alDesconectarse = () => resolve({ pendiente: true });
        window.addEventListener("offline", alDesconectarse, { once: true });
        retirarListener = () => window.removeEventListener("offline", alDesconectarse);
        if (!navigator.onLine) alDesconectarse();
    });

    const resultado = await Promise.race([resultadoEscritura, desconexion]);
    retirarListener();

    if (resultado.pendiente) {
        void resultadoEscritura.then((resultadoPendiente) => {
            if (resultadoPendiente.error) {
                notificarErrorEscritura(resultadoPendiente.error, operacion);
            }
        });
        return resultado;
    }
    if (resultado.error) throw resultado.error;
    return { pendiente: false };
}

/* ----------------------------------------------------------
   VENTAS
   ---------------------------------------------------------- */

export async function guardarVentaFirebase(ventaId, ventaData) {
    try {
        const datosPersistibles = { ...ventaData };
        delete datosPersistibles.id;
        delete datosPersistibles.sincronizada;
        ["totalUSD", "tasaDia", "totalBs"].forEach((campo) => {
            if (datosPersistibles[campo] !== undefined) {
                datosPersistibles[campo] = redondearMoneda(datosPersistibles[campo]);
            }
        });
        if (Array.isArray(datosPersistibles.productos)) {
            datosPersistibles.productos = datosPersistibles.productos.map((producto) => {
                const productoPersistible = { ...producto };
                ["precio", "subtotal"].forEach((campo) => {
                    if (productoPersistible[campo] !== undefined) {
                        productoPersistible[campo] = redondearMoneda(productoPersistible[campo]);
                    }
                });
                return productoPersistible;
            });
        }
        const cantidadItems = Array.isArray(datosPersistibles.productos)
            ? datosPersistibles.productos.length
            : 0;
        const ventaRef = doc(db, "ventas", ventaId);
        const escritura = writeBatch(db);
        escritura.set(ventaRef, {
            ...datosPersistibles,
            cantidadItems,
            estado: "Completada",
            fecha: serverTimestamp()
        });
        if (datosPersistibles.metodo === "Crédito" &&
            datosPersistibles.clienteId && !datosPersistibles.esAbono) {
            escritura.update(doc(db, "clientes", datosPersistibles.clienteId), {
                deudaUSD: increment(redondearMoneda(datosPersistibles.totalUSD || 0))
            });
        }
        const resultado = await esperarEscrituraODesconexion(
            escritura.commit(),
            "La venta",
        );
        return { id: ventaId, pendiente: resultado.pendiente };
    } catch (e) {
        console.error("Error guardando venta: ", e);
        throw e;
    }
}

export function escucharVentas(callback) {
    const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const ventas = snapshot.docs.map(doc => {
            const venta = doc.data({ serverTimestamps: "estimate" });
            return {
                id: doc.id,
                ...venta,
                _pendienteServidor: doc.metadata.hasPendingWrites
            };
        });
        callback(ventas);
    }, (error) => {
        console.error("Error escuchando ventas de Firestore:", error);
    });
}

export async function anularVentaFirebase(ventaId) {
    try {
        verificarConexion("Anular una venta");
        const ventaRef = doc(db, "ventas", ventaId);
        await runTransaction(db, async (transaction) => {
            const ventaSnapshot = await transaction.get(ventaRef);
            if (!ventaSnapshot.exists()) throw new Error("La venta no existe");

            const venta = ventaSnapshot.data();
            if (venta.estado === "Anulada") return;

            let clienteRef;
            let clienteSnapshot;
            if (venta.metodo === "Crédito" && venta.clienteId && !venta.esAbono) {
                clienteRef = doc(db, "clientes", venta.clienteId);
                clienteSnapshot = await transaction.get(clienteRef);
            }

            transaction.update(ventaRef, { estado: "Anulada" });
            if (clienteRef && clienteSnapshot.exists()) {
                transaction.update(clienteRef, {
                    deudaUSD: redondearMoneda(Math.max(
                        0,
                        (Number(clienteSnapshot.data().deudaUSD) || 0) -
                            (Number(venta.totalUSD) || 0),
                    ))
                });
            }
        });
    } catch (e) {
        console.error("Error anulando venta: ", e);
        throw e;
    }
}

export async function eliminarVentaAnuladaFirebase(ventaId) {
    try {
        verificarConexion("Eliminar una venta anulada");
        const ventaRef = doc(db, "ventas", ventaId);
        await runTransaction(db, async (transaction) => {
            const ventaSnapshot = await transaction.get(ventaRef);
            if (!ventaSnapshot.exists()) throw new Error("La venta no existe");
            if (ventaSnapshot.data().estado !== "Anulada") {
                throw new Error("Solo se pueden eliminar ventas anuladas");
            }
            transaction.delete(ventaRef);
        });
    } catch (e) {
        console.error("Error eliminando venta anulada: ", e);
        throw e;
    }
}

/* ----------------------------------------------------------
   CLIENTES Y CRÉDITOS
   ---------------------------------------------------------- */

export async function guardarClienteFirebase(clienteData) {
    try {
        verificarConexion("Crear un cliente");
        const docRef = await addDoc(collection(db, "clientes"), {
            ...clienteData,
            deudaUSD: 0,
            fechaRegistro: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error al crear cliente: ", e);
        throw e;
    }
}

export function escucharClientes(callback) {
    return onSnapshot(collection(db, "clientes"), (snapshot) => {
        const clientes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(clientes);
    }, (error) => {
        console.error("Error escuchando clientes de Firestore:", error);
    });
}

export async function registrarAbonoFirebase(cliente, montoUSD, tasa) {
    try {
        verificarConexion("Registrar un abono");
        if (!Number.isFinite(montoUSD) || montoUSD <= 0) {
            throw new Error("El monto del abono debe ser mayor que cero");
        }

        const clienteRef = doc(db, "clientes", cliente.id);
        const ventaRef = doc(db, "ventas", `AB-${crypto.randomUUID()}`);
        const montoRedondeado = redondearMoneda(montoUSD);
        const tasaRedondeada = redondearMoneda(tasa);
        if (montoRedondeado <= 0) {
            throw new Error("El monto del abono debe ser de al menos 0.01");
        }

        await runTransaction(db, async (transaction) => {
            const clienteSnapshot = await transaction.get(clienteRef);
            if (!clienteSnapshot.exists()) throw new Error("El cliente no existe");

            const deudaActual = redondearMoneda(Number(clienteSnapshot.data().deudaUSD) || 0);
            if (montoRedondeado > deudaActual) {
                throw new Error("El abono no puede ser mayor que la deuda pendiente");
            }

            transaction.update(clienteRef, {
                deudaUSD: redondearMoneda(deudaActual - montoRedondeado),
            });
            transaction.set(ventaRef, {
                productos: [],
                cantidadItems: 0,
                totalUSD: montoRedondeado,
                tasaDia: tasaRedondeada,
                totalBs: redondearMoneda(montoRedondeado * tasaRedondeada),
                metodo: "Abono en USD",
                esAbono: true,
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                estado: "Completada",
                fecha: serverTimestamp(),
            });
        });
    } catch (e) {
        console.error("Error registrando abono: ", e);
        throw e;
    }
}