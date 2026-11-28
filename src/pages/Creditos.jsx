import { useEffect, useMemo, useState } from 'react';
import {
  escucharClientes,
  guardarClienteFirebase,
  registrarAbonoFirebase,
} from '../services/firestore';
import { useApp } from '../context/useApp';
import { redondearMoneda } from '../utils/moneda';
import './Creditos.css';

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

export default function Creditos() {
  const { tasa, online } = useApp();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('');
  const [telefonoNuevoCliente, setTelefonoNuevoCliente] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);
  const [errorAbono, setErrorAbono] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const unsubscribe = escucharClientes((datos) => {
      setClientes(datos);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());

    return clientes
      .filter((cliente) => filtroActivo !== 'deuda' || Number(cliente.deudaUSD) > 0)
      .filter((cliente) => (
        !termino
        || normalizarTexto(`${cliente.nombre || ''} ${cliente.telefono || ''}`).includes(termino)
      ))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
  }, [clientes, filtroActivo, busqueda]);

  const crearCliente = async (event) => {
    event.preventDefault();
    const nombre = nombreNuevoCliente.trim();
    const telefono = telefonoNuevoCliente.trim();

    if (!nombre || !telefono) {
      setErrorCliente('Ingresa el nombre completo y el teléfono del cliente.');
      return;
    }

    setGuardandoCliente(true);
    setErrorCliente('');
    try {
      await guardarClienteFirebase({ nombre, telefono });
      setNombreNuevoCliente('');
      setTelefonoNuevoCliente('');
      setMostrarFormCliente(false);
      setMensaje('Cliente guardado correctamente.');
    } catch (error) {
      console.error(error);
      setErrorCliente('No se pudo guardar el cliente. Inténtalo de nuevo.');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const abrirAbono = (cliente) => {
    setClienteSeleccionado(cliente);
    setMontoAbono('');
    setErrorAbono('');
    setMensaje('');
  };

  const cerrarAbono = () => {
    if (guardandoAbono) return;
    setClienteSeleccionado(null);
    setErrorAbono('');
  };

  const registrarAbono = async (event) => {
    event.preventDefault();
    if (!clienteSeleccionado) return;

    const montoIngresado = Number(montoAbono);
    if (!Number.isFinite(montoIngresado) || montoIngresado <= 0) {
      setErrorAbono('Ingresa un monto en dólares mayor que cero.');
      return;
    }
    const monto = redondearMoneda(montoIngresado);
    const deudaActual = redondearMoneda(Number(clienteSeleccionado.deudaUSD) || 0);
    if (monto <= 0) {
      setErrorAbono('El monto debe ser de al menos $0.01.');
      return;
    }
    if (monto > deudaActual) {
      setErrorAbono('El abono no puede ser mayor que la deuda pendiente.');
      return;
    }

    setGuardandoAbono(true);
    setErrorAbono('');
    try {
      await registrarAbonoFirebase(clienteSeleccionado, monto, tasa);
      setClienteSeleccionado(null);
      setMontoAbono('');
      setMensaje(`Abono de $${monto.toFixed(2)} registrado correctamente.`);
    } catch (error) {
      console.error(error);
      setErrorAbono('No se pudo registrar el abono. Verifica la deuda e inténtalo de nuevo.');
    } finally {
      setGuardandoAbono(false);
    }
  };

  return (
    <div className="creditos-container">
      <header className="creditos-header">
        <div>
          <h1>Gestión de Créditos</h1>
          <p>Administra clientes y saldos pendientes.</p>
        </div>
        <button
          className="credito-nuevo-btn"
          type="button"
          disabled={!online}
          aria-expanded={mostrarFormCliente}
          aria-controls="form-nuevo-cliente"
          onClick={() => {
            setMostrarFormCliente((visible) => !visible);
            setErrorCliente('');
            setMensaje('');
          }}
        >
          {mostrarFormCliente ? 'Cancelar' : '+ Agregar nuevo cliente'}
        </button>
      </header>

      {mensaje && <p className="creditos-mensaje" role="status">{mensaje}</p>}

      {mostrarFormCliente && (
        <form id="form-nuevo-cliente" className="nuevo-cliente-form" onSubmit={crearCliente} noValidate>
          <h2>Nuevo cliente</h2>
          <div className="nuevo-cliente-campos">
            <label>
              Nombre completo
              <input
                autoComplete="name"
                value={nombreNuevoCliente}
                onChange={(event) => setNombreNuevoCliente(event.target.value)}
                placeholder="Nombre y apellido"
                required
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                autoComplete="tel"
                value={telefonoNuevoCliente}
                onChange={(event) => setTelefonoNuevoCliente(event.target.value)}
                placeholder="Número de teléfono"
                required
              />
            </label>
          </div>
          {errorCliente && <p className="creditos-error" role="alert">{errorCliente}</p>}
          <div className="creditos-form-actions">
            <button
              className="credito-guardar-btn"
              type="submit"
              disabled={guardandoCliente || !online}
            >
              {guardandoCliente ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      )}

      <section className="lista-clientes" aria-labelledby="clientes-titulo">
        <div className="lista-clientes-header">
          <div>
            <h2 id="clientes-titulo">Clientes</h2>
            {!cargando && <span>{clientesFiltrados.length} clientes</span>}
          </div>
          <label className="busqueda-clientes">
            <span className="visually-hidden">Filtrar clientes por nombre o teléfono</span>
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Filtrar clientes..."
            />
          </label>
        </div>

        <div className="clientes-filtros" role="group" aria-label="Filtrar clientes por deuda">
          <button
            className={`clientes-filtro-btn ${filtroActivo === 'todos' ? 'active' : ''}`}
            type="button"
            aria-pressed={filtroActivo === 'todos'}
            onClick={() => setFiltroActivo('todos')}
          >
            Todos
          </button>
          <button
            className={`clientes-filtro-btn ${filtroActivo === 'deuda' ? 'active' : ''}`}
            type="button"
            aria-pressed={filtroActivo === 'deuda'}
            onClick={() => setFiltroActivo('deuda')}
          >
            Con deuda activa
          </button>
        </div>

        {cargando ? (
          <p className="clientes-estado" role="status">Cargando clientes...</p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="clientes-estado">
            {clientes.length === 0
              ? 'Aún no hay clientes registrados.'
              : filtroActivo === 'deuda' && !busqueda
                ? 'No hay clientes con deuda activa.'
                : 'No se encontraron clientes con esos datos.'}
          </p>
        ) : (
          <ul className="clientes-lista">
            {clientesFiltrados.map((cliente) => {
              const deuda = Number(cliente.deudaUSD) || 0;
              return (
                <li className="cliente-card" key={cliente.id}>
                  <div className="cliente-datos">
                    <strong>{cliente.nombre}</strong>
                    <span>{cliente.telefono || 'Sin teléfono registrado'}</span>
                  </div>
                  <div className="cliente-saldo">
                    <span>Saldo pendiente</span>
                    <strong className={deuda > 0 ? 'deuda-activa' : ''}>${deuda.toFixed(2)}</strong>
                  </div>
                  {deuda > 0 && (
                    <button className="cliente-abonar-btn" type="button" onClick={() => abrirAbono(cliente)} disabled={!online}>
                      Abonar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {clienteSeleccionado && (
        <div
          className="abono-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarAbono();
          }}
        >
          <section className="abono-dialog" role="dialog" aria-modal="true" aria-labelledby="abono-titulo">
            <h2 id="abono-titulo">Registrar abono</h2>
            <p className="abono-cliente">{clienteSeleccionado.nombre}</p>
            <p className="abono-deuda">
              Deuda actual: <strong>${(Number(clienteSeleccionado.deudaUSD) || 0).toFixed(2)}</strong>
            </p>
            <form onSubmit={registrarAbono} noValidate>
              <label htmlFor="monto-abono">Monto del abono (USD)</label>
              <div className="abono-monto-input">
                <span>$</span>
                <input
                  id="monto-abono"
                  type="number"
                  inputMode="decimal"
                  value={montoAbono}
                  onChange={(event) => setMontoAbono(event.target.value)}
                  step="0.01"
                  min="0.01"
                  max={Number(clienteSeleccionado.deudaUSD) || undefined}
                  placeholder="0.00"
                  required
                />
              </div>
              {errorAbono && <p className="creditos-error" role="alert">{errorAbono}</p>}
              <div className="creditos-form-actions">
                <button className="abono-cancelar-btn" type="button" onClick={cerrarAbono} disabled={guardandoAbono}>
                  Cancelar
                </button>
                <button className="credito-guardar-btn" type="submit" disabled={guardandoAbono || !online}>
                  {guardandoAbono ? 'Guardando...' : 'Aplicar abono'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
