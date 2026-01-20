
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  CHF: 'ch',
  CAD: 'ca',
  AUD: 'au',
  NZD: 'nz',
  CNY: 'cn',
  HKD: 'hk',
  SGD: 'sg',
  SEK: 'se',
  NOK: 'no',
  DKK: 'dk',
  RUB: 'ru',
  INR: 'in',
  BRL: 'br',
  ZAR: 'za',
  TRY: 'tr',
  MXN: 'mx',
  KRW: 'kr',
  PLN: 'pl',
  IDR: 'id',
  HUF: 'hu',
  CZK: 'cz',
  ILS: 'il',
  CLP: 'cl',
  PHP: 'ph',
  AED: 'ae',
  SAR: 'sa',
  MYR: 'my',
  RON: 'ro',
};

export const getCountryCodeFromCurrency = (currency: string): string | undefined => {
    return CURRENCY_TO_COUNTRY[currency.toUpperCase()];
}
