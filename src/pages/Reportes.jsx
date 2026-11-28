import { useEffect, useState } from 'react';
import { obtenerMetricasReportes } from '../services/reportesService';
import './Reportes.css';

const tarjetasHoy = [
  {
    key: 'totalVentasDia',
    title: 'Ventas pagadas',
    description: 'Ventas completadas sin crédito',
    icon: <><path d="M4 7h16v13H4zM7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" /><path d="M4 12h16M9 15h6" /></>,
    tone: 'pagadas',
  },
  {
    key: 'totalCreditosDia',
    title: 'Créditos',
    description: 'Ventas cargadas a crédito',
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4M16 14v4M14 16h4" /></>,
    tone: 'creditos',
  },
  {
    key: 'totalAbonosDia',
    title: 'Abonos',
    description: 'Pagos recibidos a cuentas',
    icon: <><path d="M12 3v18M17 7.5c0-1.4-1.8-2.5-4-2.5S9 6.1 9 7.5 10.8 10 13 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" /><path d="m18 18 2 2 3-3" transform="translate(-1 -1)" /></>,
    tone: 'abonos',
  },
];

function IconoReporte({ children }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function TarjetaMetrica({ titulo, valor, descripcion, tono, icono }) {
  return (
    <article className={`reporte-tarjeta tono-${tono}`}>
      <span className="reporte-icono"><IconoReporte>{icono}</IconoReporte></span>
      <div className="reporte-tarjeta-texto">
        <h3>{titulo}</h3>
        <strong className="reporte-valor">${Number(valor || 0).toFixed(2)}</strong>
        {descripcion && <p>{descripcion}</p>}
      </div>
    </article>
  );
}

export default function Reportes() {
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intentoCarga, setIntentoCarga] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError('');
      try {
        const datos = await obtenerMetricasReportes();
        if (activo) setMetricas(datos);
      } catch (cargaError) {
        console.error('Error al cargar reportes:', cargaError);
        if (activo) setError('No se pudieron cargar los datos del reporte. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, [intentoCarga]);

  return (
    <section className="reportes-container">
      <header className="reportes-header">
        <div>
          <h1>Reportes</h1>
          <p>Resumen de ventas y movimientos registrados.</p>
        </div>
        <button className="reporte-imprimir-btn" type="button" onClick={() => window.print()}>
          <IconoReporte><><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></></IconoReporte>
          Imprimir reporte
        </button>
      </header>

      <div className="reportes-tablero" aria-busy={cargando}>
        {cargando && !metricas && (
          <p className="reportes-cargando" role="status">Cargando reportes...</p>
        )}
        {error && !metricas && (
          <p className="reportes-estado-error">No se pudieron mostrar las métricas.</p>
        )}

        <section className="reporte-periodo" aria-labelledby="reporte-hoy">
          <h2 id="reporte-hoy">Hoy</h2>
          <div className="reportes-grid reportes-grid-hoy">
            {cargando && !metricas ? tarjetasHoy.map((tarjeta) => (
              <TarjetaEsqueleto key={tarjeta.key} tono={tarjeta.tone} />
            )) : metricas && tarjetasHoy.map((tarjeta) => (
              <TarjetaMetrica
                key={tarjeta.key}
                titulo={tarjeta.title}
                valor={metricas[tarjeta.key]}
                descripcion={tarjeta.description}
                tono={tarjeta.tone}
                icono={tarjeta.icon}
              />
            ))}
          </div>
        </section>

        <section className="reporte-periodo" aria-labelledby="reporte-semana">
          <h2 id="reporte-semana">Esta semana <span>Lunes a domingo</span></h2>
          <div className="reportes-grid reportes-grid-periodo">
            {cargando && !metricas ? (
              <TarjetaEsqueleto tono="semana" />
            ) : metricas && (
              <TarjetaMetrica
                titulo="Total semanal"
                valor={metricas.totalSemana}
                descripcion={`Ventas $${metricas.ventasSemana.toFixed(2)} · Abonos $${metricas.abonosSemana.toFixed(2)}`}
                tono="semana"
                icono={<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18M7 13h3M7 17h6" /></>}
              />
            )}
          </div>
        </section>

        <section className="reporte-periodo" aria-labelledby="reporte-mes">
          <h2 id="reporte-mes">Este mes <span>Día 1 hasta hoy</span></h2>
          <div className="reportes-grid reportes-grid-periodo">
            {cargando && !metricas ? (
              <TarjetaEsqueleto tono="mes" />
            ) : metricas && (
              <TarjetaMetrica
                titulo="Total mensual"
                valor={metricas.totalMes}
                descripcion={`Ventas $${metricas.ventasMes.toFixed(2)} · Abonos $${metricas.abonosMes.toFixed(2)}`}
                tono="mes"
                icono={<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18M7 13h2M12 13h2M17 13h.01M7 17h2M12 17h2" /></>}
              />
            )}
          </div>
        </section>
      </div>

      {error && (
        <div className="reportes-dialogo-overlay" role="presentation">
          <section
            className="reportes-dialogo"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reportes-dialogo-titulo"
            aria-describedby="reportes-dialogo-mensaje"
          >
            <span className="reportes-dialogo-icono" aria-hidden="true">!</span>
            <h2 id="reportes-dialogo-titulo">Error al cargar reportes</h2>
            <p id="reportes-dialogo-mensaje">{error}</p>
            <div className="reportes-dialogo-acciones">
              <button type="button" className="reportes-dialogo-secundario" onClick={() => setError('')}>
                Cerrar
              </button>
              <button
                type="button"
                className="reportes-dialogo-reintentar"
                onClick={() => {
                  setError('');
                  setIntentoCarga((intento) => intento + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function TarjetaEsqueleto({ tono }) {
  return (
    <article className={`reporte-tarjeta reporte-tarjeta-esqueleto tono-${tono}`} aria-hidden="true">
      <span className="reporte-esqueleto-icono" />
      <div className="reporte-esqueleto-texto">
        <span className="reporte-esqueleto-linea reporte-esqueleto-titulo" />
        <span className="reporte-esqueleto-linea reporte-esqueleto-valor" />
        <span className="reporte-esqueleto-linea reporte-esqueleto-descripcion" />
      </div>
    </article>
  );
}
