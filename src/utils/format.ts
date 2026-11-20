import { CurrencyMode } from '../types/workshop';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function getCurrencyMultiplier(currency: CurrencyMode): number {
  return currency === 'RIAL' ? 10 : 1;
}

export function getCurrencyLabel(currency: CurrencyMode): string {
  return currency === 'RIAL' ? 'ریال' : 'تومان';
}

export function formatNumber(value: number, maxDecimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const rounded =
    maxDecimals === 0
      ? Math.round(value)
      : Number(value.toFixed(maxDecimals));
  const sign = rounded < 0 ? '−' : '';
  const absVal = Math.abs(rounded);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  }).format(absVal);
  return `${sign}${toPersianDigits(formatted)}`;
}

export function formatCurrency(
  amountInToman: number,
  currency: CurrencyMode,
  showUnit = true
): string {
  if (!Number.isFinite(amountInToman)) return '—';
  const converted = Math.round(amountInToman * getCurrencyMultiplier(currency));
  const formatted = formatNumber(converted, 0);
  return showUnit ? `${formatted} ${getCurrencyLabel(currency)}` : formatted;
}

export function formatCompactCurrency(
  amountInToman: number,
  currency: CurrencyMode
): string {
  if (!Number.isFinite(amountInToman)) return '—';
  const val = amountInToman * getCurrencyMultiplier(currency);
  const absVal = Math.abs(val);
  const sign = val < 0 ? '−' : '';
  if (absVal >= 1_000_000_000) {
    return `${sign}${formatNumber(absVal / 1_000_000_000, 2)} میلیارد`;
  }
  if (absVal >= 1_000_000) {
    return `${sign}${formatNumber(absVal / 1_000_000, 1)} میلیون`;
  }
  if (absVal >= 1_000) {
    return `${sign}${formatNumber(absVal / 1_000, 0)} هزار`;
  }
  return `${sign}${formatNumber(absVal, 0)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatNumber(value, decimals)}٪`;
}

export function parseNumericInput(raw: string): number {
  const normalized = toEnglishDigits(raw).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
