import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/useApp';
import { catalogoProductos } from '../data/catalogo';
import { guardarVentaFirebase, escucharClientes } from '../services/firestore';
import { redondearMoneda } from '../utils/moneda';
import './Caja.css';

function Icon({ name }) {
  const paths = {
    store: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /><path d="M3 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /></>,
    edit: <><path d="m16 4 4 4L9 19l-5 1 1-5L16 4Z" /><path d="m14 6 4 4M12 20h8" /></>,
    receipt: <><path d="M5 3 7 4.5 9 3l2 1.5L13 3l2 1.5L17 3l2 1.5V21l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5V3Z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    check: <><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></>,
    search: <><circle cx="10.8" cy="10.8" r="7.3" /><path d="m16.2 16.2 4.3 4.3" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };

  return (
    <svg aria-hidden="true" className="caja-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Caja() {
  const { tasa } = useApp();
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoPrecio, setTipoPrecio] = useState('detal');
  const [pestana, setPestana] = useState('catalogo');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const busquedaInputRef = useRef(null);
  const categoriasRef = useRef(null);
  const arrastreCategoriasRef = useRef(null);
  const suprimirClickCategoriaRef = useRef(false);
  const [arrastrandoCategorias, setArrastrandoCategorias] = useState(false);
  const [descripcionLibre, setDescripcionLibre] = useState('');
  const [precioLibre, setPrecioLibre] = useState('');
  const [cantidadLibre, setCantidadLibre] = useState('1');
  const [procesando, setProcesando] = useState(false);
  const [dialogo, setDialogo] = useState(null);

  useEffect(() => escucharClientes(setClientes), []);

  useEffect(() => {
    if (!dialogo) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') setDialogo(null);
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [dialogo]);

  useEffect(() => {
    if (busquedaAbierta) busquedaInputRef.current?.focus();
  }, [busquedaAbierta]);

  const iniciarArrastreCategorias = (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;

    arrastreCategoriasRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: categoriasRef.current.scrollLeft,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setArrastrandoCategorias(true);
  };

  const moverCategorias = (event) => {
    const arrastre = arrastreCategoriasRef.current;
    if (!arrastre || arrastre.pointerId !== event.pointerId) return;

    const desplazamiento = event.clientX - arrastre.startX;
    if (Math.abs(desplazamiento) > 4) arrastre.moved = true;
    if (arrastre.moved) {
      categoriasRef.current.scrollLeft = arrastre.startScrollLeft - desplazamiento;
    }
  };

  const terminarArrastreCategorias = (event) => {
    const arrastre = arrastreCategoriasRef.current;
    if (!arrastre || arrastre.pointerId !== event.pointerId) return;

    suprimirClickCategoriaRef.current = arrastre.moved;
    if (arrastre.moved) {
      window.setTimeout(() => {
        suprimirClickCategoriaRef.current = false;
      }, 0);
    }
    arrastreCategoriasRef.current = null;
    setArrastrandoCategorias(false);
  };

  const desplazarCategoriasConRueda = (event) => {
    const selector = categoriasRef.current;
    if (!selector || selector.scrollWidth <= selector.clientWidth) return;

    const desplazamiento = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    if (desplazamiento === 0) return;

    event.preventDefault();
    selector.scrollLeft += desplazamiento;
  };

  const suprimirClickTrasArrastre = (event) => {
    if (!suprimirClickCategoriaRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suprimirClickCategoriaRef.current = false;
  };

  const agregarAlCarrito = (nombre, precio, cantidad = 1) => {
    const precioRedondeado = redondearMoneda(precio);
    setCarrito((actual) => {
      const existe = actual.find((item) => item.nombre === nombre && item.precio === precioRedondeado);

      if (existe) {
        return actual.map((item) => (
          item.nombre === nombre && item.precio === precioRedondeado
            ? {
              ...item,
              cantidad: item.cantidad + cantidad,
              subtotal: redondearMoneda((item.cantidad + cantidad) * item.precio),
            }
            : item
        ));
      }

      return [...actual, {
        nombre,
        precio: precioRedondeado,
        cantidad,
        subtotal: redondearMoneda(precioRedondeado * cantidad),
      }];
    });
  };

  const cambiarCantidad = (indice, cambio) => {
    setCarrito((actual) => actual.flatMap((item, index) => {
      if (index !== indice) return [item];
      const cantidad = item.cantidad + cambio;
      return cantidad > 0
        ? [{ ...item, cantidad, subtotal: redondearMoneda(cantidad * item.precio) }]
        : [];
    }));
  };

  const totalCarrito = redondearMoneda(
    carrito.reduce((total, item) => total + item.subtotal, 0),
  );
  const tasaVenta = redondearMoneda(tasa);
  const totalVentaBs = redondearMoneda(totalCarrito * tasaVenta);
  const categorias = ['Todos', 'Panes', 'Repostería', 'Bebidas', 'Snacks'];
  const normalizarTexto = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const terminoBusqueda = normalizarTexto(busqueda.trim());
  const productosFiltrados = catalogoProductos.filter((producto) => {
    const coincideCategoria = categoriaSeleccionada === 'Todos' || producto.categoria === categoriaSeleccionada;
    const coincideBusqueda = !terminoBusqueda
      || normalizarTexto(`${producto.nombre} ${producto.categoria}`).includes(terminoBusqueda);
    return coincideCategoria && coincideBusqueda;
  });
  const terminoBusquedaCliente = normalizarTexto(busquedaCliente.trim());
  const clientesFiltrados = clientes.filter((cliente) => (
    !terminoBusquedaCliente
    || normalizarTexto(`${cliente.nombre} ${cliente.telefono || ''}`).includes(terminoBusquedaCliente)
  ));

  const agregarVentaLibre = (event) => {
    event.preventDefault();
    const nombre = descripcionLibre.trim();
    const precio = Number(precioLibre);
    const cantidad = Number(cantidadLibre);

    if (!nombre || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
      setDialogo({
        tipo: 'error',
        titulo: 'Revisa el producto',
        mensaje: 'Ingresa una descripción, un precio mayor que cero y una cantidad válida.',
      });
      return;
    }

    agregarAlCarrito(nombre, precio, cantidad);
    setDescripcionLibre('');
    setPrecioLibre('');
    setCantidadLibre('1');
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      setDialogo({
        tipo: 'aviso',
        titulo: 'Orden vacía',
        mensaje: 'Agrega al menos un producto antes de registrar la venta.',
      });
      return;
    }
    if (metodoPago === 'Crédito' && !clienteSeleccionadoId) {
      setDialogo({
        tipo: 'aviso',
        titulo: 'Selecciona un cliente',
        mensaje: 'Debes seleccionar un cliente para registrar esta venta a crédito.',
      });
      return;
    }

    setProcesando(true);
    try {
      const cliente = clientes.find((item) => item.id === clienteSeleccionadoId);
      const nuevaVenta = {
        productos: carrito,
        totalUSD: totalCarrito,
        tasaDia: tasaVenta,
        totalBs: totalVentaBs,
        metodo: metodoPago,
        esAbono: false,
        clienteId: metodoPago === 'Crédito' ? clienteSeleccionadoId : null,
        clienteNombre: metodoPago === 'Crédito' ? cliente?.nombre || '' : '',
      };

      const ventaId = `V-${crypto.randomUUID()}`;
      const resultado = await guardarVentaFirebase(ventaId, nuevaVenta);

      setCarrito([]);
      setMetodoPago('Efectivo');
      setClienteSeleccionadoId('');
      setBusquedaCliente('');
      setDialogo({
        tipo: 'exito',
        titulo: resultado.pendiente ? 'Venta en proceso' : 'Venta registrada',
        mensaje: resultado.pendiente
          ? 'La venta quedó guardada en este dispositivo y se sincronizará con Firestore cuando vuelva la conexión.'
          : 'La venta se guardó correctamente.',
      });
    } catch (error) {
      console.error(error);
      setDialogo({
        tipo: 'error',
        titulo: 'No se pudo guardar la venta',
        mensaje: error.message || 'Ocurrió un error al guardar la venta. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="caja-container">
      <div className="dolar-section">
        <label className="dolar-label">
          Valor del Dólar (USD a Bs):
          <span className="v-dolar" id="v-dolar">{tasa > 0 ? `${tasa.toFixed(2)} Bs.` : 'Sin conexión'}</span>
        </label>
      </div>

      <section className="caja-main">
        <div className="caja-layout">
          <section className="caja-catalogo" aria-label="Productos">
            <div className="tab-selector" role="tablist" aria-label="Tipo de venta">
              <button
                className={`tab-btn ${pestana === 'catalogo' ? 'active' : ''}`}
                id="tab-catalogo"
                type="button"
                role="tab"
                aria-selected={pestana === 'catalogo'}
                aria-controls="panel-catalogo"
                onClick={() => setPestana('catalogo')}
              >
                <Icon name="store" /> Catálogo
              </button>
              <button
                className={`tab-btn ${pestana === 'libre' ? 'active' : ''}`}
                id="tab-libre"
                type="button"
                role="tab"
                aria-selected={pestana === 'libre'}
                aria-controls="panel-libre"
                onClick={() => setPestana('libre')}
              >
                <Icon name="edit" /> Venta Libre
              </button>
            </div>

            {pestana === 'catalogo' ? (
              <>
                <div className="catalogo-tools">
                  <div
                    ref={categoriasRef}
                    className={`categoria-selector ${arrastrandoCategorias ? 'dragging' : ''}`}
                    role="group"
                    aria-label="Filtrar por categoría"
                    onPointerDown={iniciarArrastreCategorias}
                    onPointerMove={moverCategorias}
                    onPointerUp={terminarArrastreCategorias}
                    onPointerCancel={terminarArrastreCategorias}
                    onWheel={desplazarCategoriasConRueda}
                    onClickCapture={suprimirClickTrasArrastre}
                  >
                    {categorias.map((categoria) => (
                      <button
                        key={categoria}
                        className={`categoria-btn ${categoriaSeleccionada === categoria ? 'active' : ''}`}
                        type="button"
                        aria-pressed={categoriaSeleccionada === categoria}
                        onClick={() => setCategoriaSeleccionada(categoria)}
                      >
                        {categoria}
                      </button>
                    ))}
                  </div>
                  <div className={`busqueda-control ${busquedaAbierta ? 'expanded' : ''}`}>
                    <input
                      id="busqueda-productos"
                      type="search"
                      ref={busquedaInputRef}
                      value={busqueda}
                      onChange={(event) => setBusqueda(event.target.value)}
                      placeholder="Buscar productos..."
                      aria-label="Buscar productos por nombre o categoría"
                      aria-hidden={!busquedaAbierta}
                      tabIndex={busquedaAbierta ? 0 : -1}
                    />
                    <button
                      className="busqueda-toggle"
                      type="button"
                      aria-label={busquedaAbierta ? 'Cerrar búsqueda' : 'Buscar productos'}
                      aria-expanded={busquedaAbierta}
                      aria-controls="busqueda-productos"
                      onClick={() => {
                        setBusquedaAbierta((abierta) => !abierta);
                        if (busquedaAbierta) setBusqueda('');
                      }}
                    >
                      <Icon name={busquedaAbierta ? 'close' : 'search'} />
                    </button>
                  </div>
                </div>
                <div className="productos-card" id="panel-catalogo" role="tabpanel" aria-labelledby="tab-catalogo">
                <fieldset className="precios-section">
                  <legend>Tipo de Precio:</legend>
                  <label>
                    <input type="radio" name="tipoPrecio" value="detal" checked={tipoPrecio === 'detal'} onChange={() => setTipoPrecio('detal')} />
                    Detal
                  </label>
                  <label>
                    <input type="radio" name="tipoPrecio" value="mayor" checked={tipoPrecio === 'mayor'} onChange={() => setTipoPrecio('mayor')} />
                    Mayor
                  </label>
                </fieldset>

                <div className="productos-grid">
                  {productosFiltrados.map((producto) => {
                    const precio = tipoPrecio === 'mayor' ? producto.precioMayor : producto.precioDetal;
                    return (
                      <button
                        className="producto"
                        key={producto.nombre}
                        type="button"
                        onClick={() => agregarAlCarrito(producto.nombre, precio)}
                        aria-label={`Agregar ${producto.nombre}, $${precio.toFixed(2)}`}
                      >
                        <span className="producto-info">{producto.nombre}</span>
                        <span className="producto-precio">${precio.toFixed(2)}</span>
                      </button>
                    );
                  })}
                  {productosFiltrados.length === 0 && (
                    <p className="productos-sin-resultados">No se encontraron productos para esta búsqueda.</p>
                  )}
                </div>
                </div>
              </>
            ) : (
              <form className="venta-libre-card" id="panel-libre" role="tabpanel" aria-labelledby="tab-libre" onSubmit={agregarVentaLibre} noValidate>
                <h2>Agregar producto libre</h2>
                <label>
                  Descripción
                  <input value={descripcionLibre} onChange={(event) => setDescripcionLibre(event.target.value)} placeholder="Nombre del producto" required />
                </label>
                <div className="venta-libre-campos">
                  <label>
                    Precio (USD)
                    <input type="number" min="0.01" step="0.01" value={precioLibre} onChange={(event) => setPrecioLibre(event.target.value)} placeholder="0.00" required />
                  </label>
                  <label>
                    Cantidad
                    <input type="number" min="1" step="1" value={cantidadLibre} onChange={(event) => setCantidadLibre(event.target.value)} required />
                  </label>
                </div>
                <button className="agregar-libre-btn" type="submit"><Icon name="plus" /> Agregar a la orden</button>
              </form>
            )}
          </section>

          <section className="carrito-section" aria-label="Orden actual">
            <header className="carrito-header">
              <h1><Icon name="receipt" /> Orden Actual</h1>
              <button className="vaciar-btn" type="button" onClick={() => setCarrito([])} disabled={carrito.length === 0}>
                <Icon name="trash" /> Vaciar
              </button>
            </header>

            <div className={`carrito-items ${carrito.length === 0 ? 'carrito-vacio' : ''}`}>
              {carrito.length === 0 ? (
                <p className="empty-cart-msg">No hay productos en la orden.</p>
              ) : carrito.map((item, index) => (
                <div className="cart-item" key={`${item.nombre}-${item.precio}-${index}`}>
                  <div className="cart-item-info">
                    <strong>{item.nombre}</strong>
                    <span>${item.precio.toFixed(2)} c/u</span>
                  </div>
                  <div className="cart-item-controls">
                    <button type="button" aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(index, -1)}><Icon name="minus" /></button>
                    <span>{item.cantidad}</span>
                    <button type="button" aria-label={`Agregar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(index, 1)}><Icon name="plus" /></button>
                    <strong className="cart-item-subtotal">${item.subtotal.toFixed(2)}</strong>
                    <button className="eliminar-item-btn" type="button" aria-label={`Eliminar ${item.nombre}`} onClick={() => setCarrito((actual) => actual.filter((_, itemIndex) => itemIndex !== index))}>
                      <Icon name="close" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="carrito-footer">
              <div className="total-row main-total"><span>Total USD:</span><strong>${totalCarrito.toFixed(2)}</strong></div>
              <div className="total-row sub-total"><span>Total Bs:</span><strong>{totalVentaBs.toFixed(2)} Bs.</strong></div>

              <label className="metodo-pago-label" htmlFor="metodo-pago">Método de Pago:</label>
              <select id="metodo-pago" className="metodo-pago-select" value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Punto de Venta">Punto de Venta</option>
                <option value="Crédito">Crédito</option>
              </select>

              {metodoPago === 'Crédito' && (
                <div className="cliente-credito-label">
                  Cliente
                  <input
                    id="buscar-cliente-credito"
                    type="search"
                    placeholder="Filtrar por nombre o teléfono"
                    value={busquedaCliente}
                    onChange={(event) => {
                      setBusquedaCliente(event.target.value);
                      setClienteSeleccionadoId('');
                    }}
                  />
                  <select
                    id="cliente-credito"
                    value={clienteSeleccionadoId}
                    onChange={(event) => setClienteSeleccionadoId(event.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar Cliente --</option>
                    {clientesFiltrados.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nombre} (Deuda: ${(cliente.deudaUSD || 0).toFixed(2)})</option>
                    ))}
                  </select>
                  {clientesFiltrados.length === 0 && (
                    <span className="cliente-sin-resultados" role="status">No hay clientes que coincidan.</span>
                  )}
                </div>
              )}

              <button className="registrar-venta-btn" type="button" onClick={procesarVenta} disabled={procesando || carrito.length === 0}>
                <Icon name="check" /> {procesando ? 'Guardando...' : 'Registrar Venta'}
              </button>
            </div>
          </section>
        </div>
      </section>

      {dialogo && (
        <div
          className="caja-dialogo-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialogo(null);
          }}
        >
          <section
            className={`caja-dialogo tipo-${dialogo.tipo}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="caja-dialogo-titulo"
            aria-describedby="caja-dialogo-mensaje"
          >
            <span className="caja-dialogo-icono" aria-hidden="true">
              {dialogo.tipo === 'exito' ? '✓' : dialogo.tipo === 'error' ? '×' : '!'}
            </span>
            <h2 id="caja-dialogo-titulo">{dialogo.titulo}</h2>
            <p id="caja-dialogo-mensaje">{dialogo.mensaje}</p>
            <button className="caja-dialogo-cerrar" type="button" onClick={() => setDialogo(null)} autoFocus>
              Entendido
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
