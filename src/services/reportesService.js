import { db } from '../lib/firebase';
import { collection, getDocs, getDocsFromCache } from 'firebase/firestore';
import { redondearMoneda } from '../utils/moneda';

function fechaVentaADate(fecha) {
  if (!fecha) return null;
  const fechaConvertida = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha);
  return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
}

function esCredito(venta) {
  const metodo = String(venta.metodo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
  return !venta.esAbono && metodo === 'credito';
}

function sumarImportes(ventas) {
  return redondearMoneda(ventas.reduce((total, venta) => total + (Number(venta.totalUSD) || 0), 0));
}

function dentroDelPeriodo(fecha, inicio, fin) {
  return fecha >= inicio && fecha < fin;
}

export async function obtenerMetricasReportes(ahora = new Date()) {
  const ventasCollection = collection(db, 'ventas');
  const ventasSnapshot = navigator.onLine
    ? await getDocs(ventasCollection)
    : await getDocsFromCache(ventasCollection);
  const ventas = ventasSnapshot.docs
    .filter((documento) => !documento.metadata.hasPendingWrites)
    .map((documento) => documento.data({ serverTimestamps: 'estimate' }));

  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioManana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  const inicioSemana = new Date(inicioHoy);
  const diasDesdeLunes = (inicioSemana.getDay() + 6) % 7;
  inicioSemana.setDate(inicioSemana.getDate() - diasDesdeLunes);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 7);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

  const completadas = ventas.flatMap((venta) => {
    if (venta.estado !== 'Completada') return [];
    const fecha = fechaVentaADate(venta.fecha);
    return fecha ? [{ ...venta, _fechaReporte: fecha }] : [];
  });

  const ventasHoy = completadas.filter((venta) => dentroDelPeriodo(venta._fechaReporte, inicioHoy, inicioManana));
  const ventasSemana = completadas.filter((venta) => dentroDelPeriodo(venta._fechaReporte, inicioSemana, finSemana));
  const ventasMes = completadas.filter((venta) => dentroDelPeriodo(venta._fechaReporte, inicioMes, finMes));

  const sumarPeriodo = (registros) => {
    const abonos = registros.filter((venta) => venta.esAbono);
    const ventasSinAbonos = registros.filter((venta) => !venta.esAbono);
    const totalVentas = sumarImportes(ventasSinAbonos);
    const totalAbonos = sumarImportes(abonos);

    return {
      ventas: totalVentas,
      abonos: totalAbonos,
      total: redondearMoneda(totalVentas + totalAbonos),
    };
  };

  const ventasPagadasHoy = ventasHoy.filter((venta) => !venta.esAbono && !esCredito(venta));
  const creditosHoy = ventasHoy.filter(esCredito);
  const abonosHoy = ventasHoy.filter((venta) => venta.esAbono);
  const semana = sumarPeriodo(ventasSemana);
  const mes = sumarPeriodo(ventasMes);

  return {
    totalVentasDia: sumarImportes(ventasPagadasHoy),
    totalCreditosDia: sumarImportes(creditosHoy),
    totalAbonosDia: sumarImportes(abonosHoy),
    ventasSemana: semana.ventas,
    abonosSemana: semana.abonos,
    totalSemana: semana.total,
    ventasMes: mes.ventas,
    abonosMes: mes.abonos,
    totalMes: mes.total,
  };
}
