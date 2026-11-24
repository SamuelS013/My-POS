/* ==========================================================
   PANIFICADORA PACHOS - CONFIGURACIÓN Y SERVICIOS FIREBASE
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED,
    collection, 
    addDoc, 
    doc, 
    setDoc,
    updateDoc, 
    onSnapshot,
    query,
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDiRO4_MdcoImXEzdPx4cF-CWv8mYGTGa0",
  authDomain: "sistema-pos-713c4.firebaseapp.com",
  projectId: "sistema-pos-713c4",
  storageBucket: "sistema-pos-713c4.firebasestorage.app",
  messagingSenderId: "583867539107",
  appId: "1:583867539107:web:3d4d53f12e5bf439916916"
};

// Inicializar App y Firestore
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        tabManager: persistentMultipleTabManager()
    })
});

/* ----------------------------------------------------------
   MÉTODOS DE BASE DE DATOS (FIRESTORE)
   ---------------------------------------------------------- */

// --- VENTAS ---
export async function guardarVentaFirebase(ventaId, ventaData) {
    try {
        const datosPersistibles = { ...ventaData };
        delete datosPersistibles.id;
        delete datosPersistibles.sincronizada;
        await setDoc(doc(db, "ventas", ventaId), {
            ...datosPersistibles,
            estado: "Completada",
            fecha: serverTimestamp()
        });
        return ventaId;
    } catch (e) {
        console.error("Error guardando venta: ", e);
        throw e;
    }
}

export function escucharVentas(callback) {
    const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const ventas = snapshot.docs.map(doc => {
            const venta = doc.data();
            return {
                id: doc.id,
                ...venta,
                _pendienteServidor: doc.metadata.hasPendingWrites
            };
        });
        callback(ventas);
    });
}

export async function anularVentaFirebase(ventaId) {
    try {
        const ventaRef = doc(db, "ventas", ventaId);
        await updateDoc(ventaRef, { estado: "Anulada" });
    } catch (e) {
        console.error("Error anulando venta: ", e);
        throw e;
    }
}

// --- CLIENTES Y CRÉDITOS ---
export async function guardarClienteFirebase(clienteData) {
    try {
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
    });
}

export async function actualizarDeudaClienteFirebase(clienteId, nuevaDeuda) {
    try {
        const clienteRef = doc(db, "clientes", clienteId);
        await updateDoc(clienteRef, { deudaUSD: nuevaDeuda });
    } catch (e) {
        console.error("Error actualizando deuda: ", e);
        throw e;
    }
}