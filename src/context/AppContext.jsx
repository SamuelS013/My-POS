import { useEffect, useState } from 'react';
import { AppContext } from './AppContext.js';
import { redondearMoneda } from '../utils/moneda';

function leerTasaGuardada() {
  try {
    const tasaGuardada = Number(localStorage.getItem('my-pos-tasa'));
    return Number.isFinite(tasaGuardada) && tasaGuardada > 0
      ? redondearMoneda(tasaGuardada)
      : 0;
  } catch (error) {
    console.warn('No se pudo leer la tasa de cambio guardada:', error);
    return 0;
  }
}

export function AppProvider({ children }) {
  const [tasa, setTasa] = useState(leerTasaGuardada);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const actualizarConexion = () => setOnline(navigator.onLine);
    window.addEventListener('online', actualizarConexion);
    window.addEventListener('offline', actualizarConexion);
    return () => {
      window.removeEventListener('online', actualizarConexion);
      window.removeEventListener('offline', actualizarConexion);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function actualizarTasa() {
      try {
        const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
          signal: controller.signal,
        });
        if (!respuesta.ok) throw new Error(`Respuesta HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        const promedio = Number(datos?.promedio);
        if (!Number.isFinite(promedio) || promedio <= 0) {
          throw new Error('La API devolvió una tasa de cambio inválida.');
        }

        const tasaActualizada = redondearMoneda(promedio);
        setTasa(tasaActualizada);

        try {
          localStorage.setItem('my-pos-tasa', tasaActualizada.toFixed(2));
        } catch (error) {
          console.warn('No se pudo guardar la tasa de cambio localmente:', error);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error al obtener el dólar:', error);
        }
      }
    }

    void actualizarTasa();
    return () => controller.abort();
  }, []);

  return (
    <AppContext.Provider value={{ tasa, setTasa, online }}>
      {children}
    </AppContext.Provider>
  );
}