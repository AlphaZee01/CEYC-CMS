export const CURRENCY_CODE = "GHS";
export const CURRENCY_SYMBOL = "₵";

export function formatCurrency(amount) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString("en-GH")}`;
}
