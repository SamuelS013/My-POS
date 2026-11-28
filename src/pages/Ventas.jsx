import { useState, useEffect } from 'react';
import {
  escucharVentas,
  anularVentaFirebase,
  eliminarVentaAnuladaFirebase,
} from '../services/firestore';
import { useApp } from '../context/useApp';
import './Ventas.css';

function convertirFecha(fecha) {
  if (!fecha) return null;

  const fechaConvertida = typeof fecha.toDate === 'function'
    ? fecha.toDate()
    : new Date(fecha);

  return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
}

function esMismoDia(fecha, referencia) {
  return fecha.getFullYear() === referencia.getFullYear()
    && fecha.getMonth() === referencia.getMonth()
    && fecha.getDate() === referencia.getDate();
}

function contarItems(venta) {
  if (Number.isInteger(venta.cantidadItems) && venta.cantidadItems >= 0) {
    return venta.cantidadItems;
  }
  return Array.isArray(venta.productos) ? venta.productos.length : 0;
}

function obtenerTipoMetodo(metodo = '') {
  const metodoNormalizado = metodo.toLocaleLowerCase();
  if (metodoNormalizado.includes('crédito') || metodoNormalizado.includes('credito')) return 'credito';
  if (metodoNormalizado.includes('mixto')) return 'mixto';
  if (metodoNormalizado.includes('efectivo')) return 'efectivo';
  if (metodoNormalizado.includes('punto') || metodoNormalizado.includes('tarjeta')) return 'punto';
  if (
    metodoNormalizado.includes('transfer')
    || metodoNormalizado.includes('móvil')
    || metodoNormalizado.includes('movil')
  ) return 'transferencia';
  return 'otro';
}

function MetodoIcono({ metodo }) {
  const tipo = obtenerTipoMetodo(metodo);
  const iconos = {
    efectivo: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9h.01M17 15h.01" /></>,
    punto: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h8M9 17h6" /></>,
    transferencia: <><path d="M4 7h14l-3-3M20 17H6l3 3" /><path d="M18 7l-3 3M6 17l3-3" /></>,
    mixto: <><path d="M4 7h6l4 10h6M4 17h6l4-10h6" /><circle cx="4" cy="7" r="1" /><circle cx="20" cy="7" r="1" /><circle cx="4" cy="17" r="1" /><circle cx="20" cy="17" r="1" /></>,
    credito: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    otro: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  return (
    <svg aria-hidden="true" className="venta-metodo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconos[tipo]}
    </svg>
  );
}

function formatearHora(fecha) {
  if (!fecha) return 'Hora no disponible';
  return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

export default function Ventas() {
  const { online } = useApp();
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState('hoy');
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState(null);
  const [dialogoAccion, setDialogoAccion] = useState(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  useEffect(() => {
    const unsubscribe = escucharVentas((datos) => {
      setVentas(datos);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!ventaSeleccionadaId && !dialogoAccion) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key !== 'Escape' || procesandoAccion) return;
      if (dialogoAccion) {
        setDialogoAccion(null);
      } else {
        setVentaSeleccionadaId(null);
      }
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [ventaSeleccionadaId, dialogoAccion, procesandoAccion]);

  const solicitarAccion = (accion, venta) => {
    if (accion === 'eliminar' && venta.estado !== 'Anulada') {
      setDialogoAccion({
        tipo: 'resultado',
        resultado: 'error',
        titulo: 'No se puede eliminar',
        mensaje: 'Solo se pueden eliminar ventas que ya estén anuladas.',
      });
      return;
    }

    setDialogoAccion({
      tipo: 'confirmacion',
      accion,
      ventaId: venta.id,
      titulo: accion === 'anular' ? 'Anular venta' : 'Eliminar venta anulada',
      mensaje: accion === 'anular'
        ? '¿Quieres anular esta venta? Esta acción actualizará su estado.'
        : '¿Quieres eliminar definitivamente esta venta? Esta acción no se puede deshacer.',
    });
  };

  const confirmarAccion = async () => {
    if (dialogoAccion?.tipo !== 'confirmacion' || procesandoAccion) return;

    const { accion, ventaId } = dialogoAccion;
    setProcesandoAccion(true);
    try {
      if (accion === 'anular') {
        await anularVentaFirebase(ventaId);
        setDialogoAccion({
          tipo: 'resultado',
          resultado: 'exito',
          titulo: 'Venta anulada',
          mensaje: 'La venta se anuló correctamente.',
        });
      } else {
        await eliminarVentaAnuladaFirebase(ventaId);
        setVentaSeleccionadaId(null);
        setDialogoAccion({
          tipo: 'resultado',
          resultado: 'exito',
          titulo: 'Venta eliminada',
          mensaje: 'La venta se eliminó de forma permanente.',
        });
      }
    } catch (error) {
      console.error(`Error al ${accion} la venta:`, error);
      setDialogoAccion({
        tipo: 'resultado',
        resultado: 'error',
        titulo: accion === 'anular' ? 'No se pudo anular' : 'No se pudo eliminar',
        mensaje: accion === 'eliminar'
          ? 'La venta no pudo eliminarse. Verifica que siga anulada e inténtalo de nuevo.'
          : 'Ocurrió un problema al anular la venta. Inténtalo de nuevo.',
      });
    } finally {
      setProcesandoAccion(false);
    }
  };

  const ventaSeleccionada = ventas.find((venta) => venta.id === ventaSeleccionadaId);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const ventasDeHoy = [];
  const ventasDeAyer = [];

  ventas.forEach((venta) => {
    const fecha = convertirFecha(venta.fecha);
    if (!fecha) return;
    if (esMismoDia(fecha, hoy)) ventasDeHoy.push(venta);
    if (esMismoDia(fecha, ayer)) ventasDeAyer.push(venta);
  });

  const ventasVisibles = diaSeleccionado === 'hoy' ? ventasDeHoy : ventasDeAyer;
  const formatearTotal = (total) => `$${Number(total || 0).toFixed(2)}`;

  return (
    <div className="ventas-container sales-section">
      <h1>Ventas</h1>

      <div className="ventas-dias" role="tablist" aria-label="Ventas por día">
        <button
          className={`ventas-dia-btn ${diaSeleccionado === 'hoy' ? 'active' : ''}`}
          id="ventas-hoy-tab"
          type="button"
          role="tab"
          aria-selected={diaSeleccionado === 'hoy'}
          aria-controls="ventas-dia-panel"
          onClick={() => setDiaSeleccionado('hoy')}
        >
          <span>Ventas del día</span>
          <strong>{cargando ? '—' : ventasDeHoy.length}</strong>
        </button>
        <button
          className={`ventas-dia-btn ${diaSeleccionado === 'ayer' ? 'active' : ''}`}
          id="ventas-ayer-tab"
          type="button"
          role="tab"
          aria-selected={diaSeleccionado === 'ayer'}
          aria-controls="ventas-dia-panel"
          onClick={() => setDiaSeleccionado('ayer')}
        >
          <span>Ventas de ayer</span>
          <strong>{cargando ? '—' : ventasDeAyer.length}</strong>
        </button>
      </div>

      <section
        className="ventas-del-dia"
        id="ventas-dia-panel"
        role="tabpanel"
        aria-labelledby={diaSeleccionado === 'hoy' ? 'ventas-hoy-tab' : 'ventas-ayer-tab'}
      >
        {cargando ? (
          <>
            <p className="ventas-cargando" role="status">Cargando ventas...</p>
            <div className="ventas-skeleton-list" aria-hidden="true">
              {[0, 1, 2].map((fila) => (
                <div className="venta-skeleton-card" key={fila}>
                  <span className="skeleton-icon" />
                  <span className="skeleton-contenido">
                    <span className="skeleton-line skeleton-line-principal" />
                    <span className="skeleton-line skeleton-line-secundaria" />
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : ventasVisibles.length === 0 ? (
          <p className="ventas-vacias">No hay ventas ni créditos para {diaSeleccionado === 'hoy' ? 'hoy' : 'ayer'}.</p>
        ) : (
          <div className="ventas-cards">
            {ventasVisibles.map((venta) => {
              const fecha = convertirFecha(venta.fecha);
              const items = contarItems(venta);
              return (
                <button
                  key={venta.id}
                  className={`venta-card ${venta.estado === 'Anulada' ? 'anulada' : ''}`}
                  type="button"
                  onClick={() => setVentaSeleccionadaId(venta.id)}
                  aria-label={`Ver venta de ${formatearTotal(venta.totalUSD)} por ${venta.metodo || 'método no especificado'}`}
                >
                  <span className={`venta-card-icon metodo-${obtenerTipoMetodo(venta.metodo)}`}>
                    <MetodoIcono metodo={venta.metodo} />
                  </span>
                  <span className="venta-card-contenido">
                    <span className="venta-card-superior">
                      <span>{formatearHora(fecha)}</span>
                      <strong>{formatearTotal(venta.totalUSD)}</strong>
                    </span>
                    <span className="venta-card-inferior">
                      <span>{venta.esAbono ? 'Abono · ' : ''}{venta.metodo || 'Método no especificado'}</span>
                      <span>{items} {items === 1 ? 'producto' : 'productos'}</span>
                    </span>
                    {venta.estado === 'Anulada' && <span className="venta-card-estado">Anulada</span>}
                    {venta._pendienteServidor && (
                      <span className="venta-card-estado">
                        {online ? 'Sincronizando...' : 'En proceso · Sin conexión'}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {ventaSeleccionada && (
        <div className="ticket-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setVentaSeleccionadaId(null);
        }}>
          <section className="ticket-dialog" role="dialog" aria-modal="true" aria-labelledby="ticket-titulo">
            <header className="ticket-header">
              <div>
                <p>Comprobante</p>
                <h2 id="ticket-titulo">{ventaSeleccionada.esAbono ? 'Abono de crédito' : 'Detalle de venta'}</h2>
              </div>
              <button className="ticket-cerrar" type="button" onClick={() => setVentaSeleccionadaId(null)} aria-label="Cerrar detalle">
                ×
              </button>
            </header>

            <div className="ticket-meta">
              <span>{formatearHora(convertirFecha(ventaSeleccionada.fecha))}</span>
              <span>{ventaSeleccionada.metodo || 'Método no especificado'}</span>
              {ventaSeleccionada.clienteNombre && <span>Cliente: {ventaSeleccionada.clienteNombre}</span>}
              <span>Estado: {ventaSeleccionada.estado || 'Completada'}</span>
            </div>

            <div className="ticket-productos">
              {ventaSeleccionada.productos?.length ? (
                <>
                  {ventaSeleccionada.productos.map((producto, index) => {
                    const cantidad = Number(producto.cantidad) || 0;
                    const precio = Number(producto.precio) || 0;
                    const subtotal = Number(producto.subtotal);
                    return (
                      <div className="ticket-producto" key={`${producto.nombre}-${index}`}>
                        <div>
                          <strong>{producto.nombre}</strong>
                          <span>{cantidad} × {formatearTotal(precio)}</span>
                        </div>
                        <strong>{formatearTotal(Number.isFinite(subtotal) ? subtotal : cantidad * precio)}</strong>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="ticket-sin-productos">{ventaSeleccionada.esAbono ? 'Abono aplicado a la cuenta del cliente.' : 'Esta venta no tiene productos registrados.'}</p>
              )}
            </div>

            <div className="ticket-total">
              <span>{ventaSeleccionada.esAbono ? 'Total abonado' : 'Total'}</span>
              <strong>{formatearTotal(ventaSeleccionada.totalUSD)}</strong>
            </div>
            {Number(ventaSeleccionada.totalBs) > 0 && (
              <div className="ticket-total ticket-total-bs">
                <span>Total en Bs.</span>
                <strong>{Number(ventaSeleccionada.totalBs).toFixed(2)} Bs.</strong>
              </div>
            )}

            {ventaSeleccionada.estado === 'Anulada' ? (
              <button className="venta-eliminar-btn" type="button" onClick={() => solicitarAccion('eliminar', ventaSeleccionada)} disabled={!online}>
                Eliminar venta anulada
              </button>
            ) : (
              <button className="venta-anular-btn" type="button" onClick={() => solicitarAccion('anular', ventaSeleccionada)} disabled={!online}>
                Anular venta
              </button>
            )}
          </section>
        </div>
      )}

      {dialogoAccion && (
        <div
          className="ventas-dialogo-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !procesandoAccion) setDialogoAccion(null);
          }}
        >
          <section
            className={`ventas-dialogo ${dialogoAccion.resultado === 'error' ? 'error' : ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ventas-dialogo-titulo"
            aria-describedby="ventas-dialogo-mensaje"
          >
            <span className="ventas-dialogo-indicador" aria-hidden="true">
              {dialogoAccion.tipo === 'confirmacion' ? '!' : dialogoAccion.resultado === 'exito' ? '✓' : '×'}
            </span>
            <h2 id="ventas-dialogo-titulo">{dialogoAccion.titulo}</h2>
            <p id="ventas-dialogo-mensaje">{dialogoAccion.mensaje}</p>
            <div className="ventas-dialogo-acciones">
              {dialogoAccion.tipo === 'confirmacion' ? (
                <>
                  <button
                    className="ventas-dialogo-secundario"
                    type="button"
                    disabled={procesandoAccion}
                    onClick={() => setDialogoAccion(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="ventas-dialogo-confirmar"
                    type="button"
                    disabled={procesandoAccion || !online}
                    onClick={confirmarAccion}
                  >
                    {procesandoAccion
                      ? 'Procesando...'
                      : dialogoAccion.accion === 'anular' ? 'Sí, anular' : 'Sí, eliminar'}
                  </button>
                </>
              ) : (
                <button
                  className="ventas-dialogo-confirmar"
                  type="button"
                  onClick={() => setDialogoAccion(null)}
                >
                  Entendido
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}