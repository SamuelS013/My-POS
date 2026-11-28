export function redondearMoneda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    throw new TypeError('El importe debe ser un número finito.');
  }

  const redondeado = Math.sign(numero)
    * Math.round((Math.abs(numero) + Number.EPSILON) * 100)
    / 100;
  return Number(redondeado.toFixed(2));
}
