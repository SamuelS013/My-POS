import { initializeApp } from "firebase/app";
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiRO4_MdcoImXEzdPx4cF-CWv8mYGTGa0",
  authDomain: "sistema-pos-713c4.firebaseapp.com",
  projectId: "sistema-pos-713c4",
  storageBucket: "sistema-pos-713c4.firebasestorage.app",
  messagingSenderId: "583867539107",
  appId: "1:583867539107:web:3d4d53f12e5bf439916916"
};

const app = initializeApp(firebaseConfig);

// Inicializamos con la caché persistente para que funcione offline
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        tabManager: persistentMultipleTabManager()
    })
});