import { formatCurrency, formatPercent } from "@/lib/utils";

export function displayCurrency(value?: number | null) {
  if (value === undefined || value === null) {
    return "Not available";
  }

  return formatCurrency(value);
}

export function displayPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return "Not available";
  }

  return formatPercent(value);
}

export function displayDate(value?: string | Date | null) {
  if (!value) {
    return "Not available";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(date);
}
