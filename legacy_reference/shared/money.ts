const MONEY_SCALE = 100;

function parseMoneyValue(value: number | string): number {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric;
}

export function roundToMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value + Number.EPSILON) * MONEY_SCALE) / MONEY_SCALE;
}

export function toHalalas(value: number | string): number {
  const numeric = parseMoneyValue(value);
  return Math.round((numeric + Number.EPSILON) * MONEY_SCALE);
}

export function fromHalalas(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value / MONEY_SCALE;
}

export function sumMoney(values: Array<number | string>): number {
  const totalHalalas = values.reduce<number>((sum, value) => sum + toHalalas(value), 0);
  return fromHalalas(totalHalalas);
}

export function splitMoneyEvenly(total: number, parts: number): number[] {
  if (!Number.isFinite(total) || parts <= 0) {
    return [];
  }

  const totalCents = Math.round((total + Number.EPSILON) * MONEY_SCALE);
  const baseShare = Math.floor(totalCents / parts);
  const remainder = totalCents - baseShare * parts;

  return Array.from({ length: parts }, (_, index) => {
    const cents = baseShare + (index < remainder ? 1 : 0);
    return cents / MONEY_SCALE;
  });
}
