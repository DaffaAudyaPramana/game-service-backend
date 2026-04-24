export function generateOrderId(lastId) {
  const number = String(lastId + 1).padStart(4, "0");
  return `TRX-${number}`;
}