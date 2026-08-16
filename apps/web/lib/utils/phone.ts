// Normaliza un numero celular colombiano ingresado sin +57 al formato
// E.164 que espera el backend (+573XXXXXXXXX).
export function toE164Colombia(rawInput: string): string {
  const digitsOnly = rawInput.replace(/\D/g, "");

  if (digitsOnly.startsWith("57") && digitsOnly.length === 12) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    return `+57${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}
