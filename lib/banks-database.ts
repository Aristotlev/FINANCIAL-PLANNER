// Comprehensive International Banks Database with Icons
export interface BankInfo {
  id: string;
  name: string;
  country: string;
  continent: string;
  logoUrl?: string;
  color: string;
  website: string;
  type: 'retail' | 'investment' | 'digital' | 'credit-union';
  products: string[];
}

export const INTERNATIONAL_BANKS: BankInfo[] = [
  // United States
  {
    id: 'chase',
    name: 'JPMorgan Chase Bank',
    country: 'United States',
    continent: 'North America',
    color: '#0066b2',
    website: 'chase.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'bofa',
    name: 'Bank of America',
    country: 'United States',
    continent: 'North America',
    color: '#e31837',
    website: 'bankofamerica.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'wells-fargo',
    name: 'Wells Fargo',
    country: 'United States',
    continent: 'North America',
    color: '#d71e2b',
    website: 'wellsfargo.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'citibank',
    name: 'Citibank',
    country: 'United States',
    continent: 'North America',
    color: '#056dae',
    website: 'citibank.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Investment', 'International']
  },
  {
    id: 'goldman-sachs',
    name: 'Goldman Sachs (Marcus)',
    country: 'United States',
    continent: 'North America',
    color: '#002868',
    website: 'marcus.com',
    type: 'digital',
    products: ['High-Yield Savings', 'CDs', 'Personal Loans', 'Investment']
  },
  {
    id: 'ally',
    name: 'Ally Bank',
    country: 'United States',
    continent: 'North America',
    color: '#7b68ee',
    website: 'ally.com',
    type: 'digital',
    products: ['High-Yield Savings', 'Checking', 'CDs', 'Auto Loans', 'Investment']
  },
  {
    id: 'capital-one',
    name: 'Capital One',
    country: 'United States',
    continent: 'North America',
    color: '#da020e',
    website: 'capitalone.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Auto Loans', 'Business Banking']
  },
  {
    id: 'schwab',
    name: 'Charles Schwab Bank',
    country: 'United States',
    continent: 'North America',
    color: '#00a0df',
    website: 'schwab.com',
    type: 'investment',
    products: ['High-Yield Checking', 'Savings', 'Investment', 'Brokerage', 'Retirement']
  },

  // Canada
  {
    id: 'rbc',
    name: 'Royal Bank of Canada (RBC)',
    country: 'Canada',
    continent: 'North America',
    color: '#005daa',
    website: 'rbc.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'td-canada',
    name: 'TD Bank Group',
    country: 'Canada',
    continent: 'North America',
    color: '#00b04f',
    website: 'td.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    country: 'Canada',
    continent: 'North America',
    color: '#ee2e24',
    website: 'scotiabank.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'International Banking', 'Investment']
  },
  {
    id: 'bmo',
    name: 'Bank of Montreal (BMO)',
    country: 'Canada',
    continent: 'North America',
    color: '#00aeef',
    website: 'bmo.com',
    type: 'retail',
    products: ['Checking', 'Savings', 'Credit Cards', 'Mortgages', 'Wealth Management']
  },

  // United Kingdom
  {
    id: 'hsbc-uk',
    name: 'HSBC UK',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#db0011',
    website: 'hsbc.co.uk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'International']
  },
  {
    id: 'barclays',
    name: 'Barclays',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#00aeef',
    website: 'barclays.co.uk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Investment Banking', 'Wealth']
  },
  {
    id: 'lloyds',
    name: 'Lloyds Bank',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#006937',
    website: 'lloydsbank.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'natwest',
    name: 'NatWest',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#5a287d',
    website: 'natwest.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Business Banking', 'Mortgages']
  },
  {
    id: 'santander-uk',
    name: 'Santander UK',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#ec0000',
    website: 'santander.co.uk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'halifax',
    name: 'Halifax',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#0085ca',
    website: 'halifax.co.uk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Credit Cards', 'Insurance']
  },
  {
    id: 'nationwide',
    name: 'Nationwide Building Society',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#002a54',
    website: 'nationwide.co.uk',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Mortgages', 'Credit Cards', 'Insurance']
  },
  {
    id: 'tesco-bank',
    name: 'Tesco Bank',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#00539f',
    website: 'tescobank.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Insurance']
  },
  {
    id: 'metro-bank',
    name: 'Metro Bank',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#d4145a',
    website: 'metrobankonline.co.uk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Business Banking', 'Mortgages', 'Loans']
  },

  // Germany
  {
    id: 'deutsche-bank',
    name: 'Deutsche Bank',
    country: 'Germany',
    continent: 'Europe',
    color: '#0018a8',
    website: 'db.com',
    type: 'investment',
    products: ['Current Account', 'Savings', 'Investment Banking', 'Wealth Management', 'Corporate']
  },
  {
    id: 'commerzbank',
    name: 'Commerzbank',
    country: 'Germany',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'commerzbank.de',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Business Banking', 'Corporate']
  },
  {
    id: 'dkb',
    name: 'DKB (Deutsche Kreditbank)',
    country: 'Germany',
    continent: 'Europe',
    color: '#005ca9',
    website: 'dkb.de',
    type: 'digital',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'postbank',
    name: 'Postbank',
    country: 'Germany',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'postbank.de',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'sparkasse',
    name: 'Sparkasse',
    country: 'Germany',
    continent: 'Europe',
    color: '#ff0000',
    website: 'sparkasse.de',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'volksbank',
    name: 'Volksbank',
    country: 'Germany',
    continent: 'Europe',
    color: '#003d7a',
    website: 'volksbank.de',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'hypovereinsbank',
    name: 'HypoVereinsbank (UniCredit)',
    country: 'Germany',
    continent: 'Europe',
    color: '#e2001a',
    website: 'hypovereinsbank.de',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Investment', 'Mortgages', 'Corporate']
  },
  {
    id: 'ing-germany',
    name: 'ING Germany',
    country: 'Germany',
    continent: 'Europe',
    color: '#ff6200',
    website: 'ing.de',
    type: 'digital',
    products: ['Current Account', 'Savings', 'Investment', 'Mortgages', 'Consumer Loans']
  },

  // France
  {
    id: 'bnp-paribas',
    name: 'BNP Paribas',
    country: 'France',
    continent: 'Europe',
    color: '#009639',
    website: 'bnpparibas.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Investment Banking', 'Insurance']
  },
  {
    id: 'credit-agricole',
    name: 'Crédit Agricole',
    country: 'France',
    continent: 'Europe',
    color: '#00a651',
    website: 'credit-agricole.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Agricultural Finance', 'Insurance']
  },
  {
    id: 'societe-generale',
    name: 'Société Générale',
    country: 'France',
    continent: 'Europe',
    color: '#e50113',
    website: 'societegenerale.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Investment Banking', 'Corporate Banking', 'Trading']
  },
  {
    id: 'lcl',
    name: 'LCL (Le Crédit Lyonnais)',
    country: 'France',
    continent: 'Europe',
    color: '#003366',
    website: 'lcl.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'la-banque-postale',
    name: 'La Banque Postale',
    country: 'France',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'labanquepostale.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'caisse-epargne',
    name: 'Caisse d\'Épargne',
    country: 'France',
    continent: 'Europe',
    color: '#008c45',
    website: 'caisse-epargne.fr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'credit-mutuel',
    name: 'Crédit Mutuel',
    country: 'France',
    continent: 'Europe',
    color: '#003d7a',
    website: 'creditmutuel.fr',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'boursorama',
    name: 'Boursorama Banque',
    country: 'France',
    continent: 'Europe',
    color: '#e60028',
    website: 'boursorama.com',
    type: 'digital',
    products: ['Current Account', 'Savings', 'Investment', 'Credit Cards', 'Brokerage']
  },

  // Spain
  {
    id: 'santander-spain',
    name: 'Banco Santander',
    country: 'Spain',
    continent: 'Europe',
    color: '#ec0000',
    website: 'santander.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'International']
  },
  {
    id: 'bbva',
    name: 'BBVA',
    country: 'Spain',
    continent: 'Europe',
    color: '#004481',
    website: 'bbva.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Digital Banking', 'International']
  },
  {
    id: 'caixabank',
    name: 'CaixaBank',
    country: 'Spain',
    continent: 'Europe',
    color: '#0077c8',
    website: 'caixabank.es',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'bankia',
    name: 'Bankia',
    country: 'Spain',
    continent: 'Europe',
    color: '#00a651',
    website: 'bankia.es',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'banco-sabadell',
    name: 'Banco Sabadell',
    country: 'Spain',
    continent: 'Europe',
    color: '#0065ae',
    website: 'bancsabadell.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Business Banking', 'Investment']
  },
  {
    id: 'ibercaja',
    name: 'Ibercaja',
    country: 'Spain',
    continent: 'Europe',
    color: '#003d7a',
    website: 'ibercaja.es',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },

  // Italy
  {
    id: 'unicredit',
    name: 'UniCredit',
    country: 'Italy',
    continent: 'Europe',
    color: '#000000',
    website: 'unicredit.it',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Investment Banking', 'Corporate']
  },
  {
    id: 'intesa-sanpaolo',
    name: 'Intesa Sanpaolo',
    country: 'Italy',
    continent: 'Europe',
    color: '#1e4d8b',
    website: 'intesasanpaolo.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Wealth Management', 'Corporate']
  },
  {
    id: 'bnl',
    name: 'BNL (Banca Nazionale del Lavoro)',
    country: 'Italy',
    continent: 'Europe',
    color: '#009639',
    website: 'bnl.it',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'monte-paschi',
    name: 'Banca Monte dei Paschi di Siena',
    country: 'Italy',
    continent: 'Europe',
    color: '#003d7a',
    website: 'mps.it',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'banco-bpm',
    name: 'Banco BPM',
    country: 'Italy',
    continent: 'Europe',
    color: '#0066cc',
    website: 'bancobpm.it',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Business Banking', 'Leasing']
  },
  {
    id: 'fineco',
    name: 'FinecoBank',
    country: 'Italy',
    continent: 'Europe',
    color: '#0066cc',
    website: 'finecobank.com',
    type: 'digital',
    products: ['Current Account', 'Investment', 'Trading', 'Credit Cards', 'Mortgages']
  },

  // Netherlands
  {
    id: 'ing',
    name: 'ING Bank',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#ff6200',
    website: 'ing.nl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Business Banking']
  },
  {
    id: 'abn-amro',
    name: 'ABN AMRO',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#00a94f',
    website: 'abnamro.nl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Corporate Banking']
  },
  {
    id: 'rabobank',
    name: 'Rabobank',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#ff6600',
    website: 'rabobank.nl',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Mortgages', 'Agricultural Banking', 'Business Banking']
  },
  {
    id: 'sns-bank',
    name: 'SNS Bank',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#0066cc',
    website: 'snsbank.nl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Credit Cards', 'Insurance']
  },
  {
    id: 'asn-bank',
    name: 'ASN Bank',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#00a651',
    website: 'asnbank.nl',
    type: 'digital',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Sustainable Banking']
  },

  // Switzerland
  {
    id: 'ubs',
    name: 'UBS',
    country: 'Switzerland',
    continent: 'Europe',
    color: '#e60028',
    website: 'ubs.com',
    type: 'investment',
    products: ['Wealth Management', 'Investment Banking', 'Asset Management', 'Private Banking']
  },
  {
    id: 'credit-suisse',
    name: 'Credit Suisse',
    country: 'Switzerland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'credit-suisse.com',
    type: 'investment',
    products: ['Wealth Management', 'Investment Banking', 'Private Banking', 'Asset Management']
  },
  {
    id: 'raiffeisen-swiss',
    name: 'Raiffeisen Switzerland',
    country: 'Switzerland',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'raiffeisen.ch',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Business Banking']
  },
  {
    id: 'postfinance',
    name: 'PostFinance',
    country: 'Switzerland',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'postfinance.ch',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Investment', 'E-Finance']
  },
  {
    id: 'zuercher-kantonalbank',
    name: 'Zürcher Kantonalbank',
    country: 'Switzerland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'zkb.ch',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Private Banking']
  },

  // Belgium
  {
    id: 'kbc',
    name: 'KBC Bank',
    country: 'Belgium',
    continent: 'Europe',
    color: '#0066cc',
    website: 'kbc.be',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'belfius',
    name: 'Belfius Bank',
    country: 'Belgium',
    continent: 'Europe',
    color: '#6633cc',
    website: 'belfius.be',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'ing-belgium',
    name: 'ING Belgium',
    country: 'Belgium',
    continent: 'Europe',
    color: '#ff6200',
    website: 'ing.be',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Business Banking']
  },
  {
    id: 'bnp-paribas-fortis',
    name: 'BNP Paribas Fortis',
    country: 'Belgium',
    continent: 'Europe',
    color: '#009639',
    website: 'bnpparibasfortis.be',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Austria
  {
    id: 'erste-bank',
    name: 'Erste Bank',
    country: 'Austria',
    continent: 'Europe',
    color: '#e2001a',
    website: 'erstebank.at',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'raiffeisen-austria',
    name: 'Raiffeisen Bank International',
    country: 'Austria',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'raiffeisen.at',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Corporate Banking', 'Investment']
  },
  {
    id: 'bawag',
    name: 'BAWAG P.S.K.',
    country: 'Austria',
    continent: 'Europe',
    color: '#0066cc',
    website: 'bawagpsk.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Leasing']
  },
  {
    id: 'bank-austria',
    name: 'Bank Austria (UniCredit)',
    country: 'Austria',
    continent: 'Europe',
    color: '#e2001a',
    website: 'bankaustria.at',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Sweden
  {
    id: 'swedbank',
    name: 'Swedbank',
    country: 'Sweden',
    continent: 'Europe',
    color: '#ff6600',
    website: 'swedbank.se',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'seb',
    name: 'SEB (Skandinaviska Enskilda Banken)',
    country: 'Sweden',
    continent: 'Europe',
    color: '#00a651',
    website: 'seb.se',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Investment Banking', 'Wealth Management', 'Corporate']
  },
  {
    id: 'handelsbanken',
    name: 'Svenska Handelsbanken',
    country: 'Sweden',
    continent: 'Europe',
    color: '#0066cc',
    website: 'handelsbanken.se',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Investment', 'Corporate Banking']
  },
  {
    id: 'nordea',
    name: 'Nordea',
    country: 'Sweden',
    continent: 'Europe',
    color: '#0000a0',
    website: 'nordea.se',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Denmark
  {
    id: 'danske-bank',
    name: 'Danske Bank',
    country: 'Denmark',
    continent: 'Europe',
    color: '#003755',
    website: 'danskebank.dk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'nordea-denmark',
    name: 'Nordea Denmark',
    country: 'Denmark',
    continent: 'Europe',
    color: '#0000a0',
    website: 'nordea.dk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'jyske-bank',
    name: 'Jyske Bank',
    country: 'Denmark',
    continent: 'Europe',
    color: '#cc0000',
    website: 'jyskebank.dk',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Norway
  {
    id: 'dnb',
    name: 'DNB (Den Norske Bank)',
    country: 'Norway',
    continent: 'Europe',
    color: '#006633',
    website: 'dnb.no',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'nordea-norway',
    name: 'Nordea Norway',
    country: 'Norway',
    continent: 'Europe',
    color: '#0000a0',
    website: 'nordea.no',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'sparebank1',
    name: 'SpareBank 1',
    country: 'Norway',
    continent: 'Europe',
    color: '#0066cc',
    website: 'sparebank1.no',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Mortgages', 'Credit Cards', 'Insurance']
  },

  // Finland
  {
    id: 'nordea-finland',
    name: 'Nordea Finland',
    country: 'Finland',
    continent: 'Europe',
    color: '#0000a0',
    website: 'nordea.fi',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'op-financial',
    name: 'OP Financial Group',
    country: 'Finland',
    continent: 'Europe',
    color: '#ff6600',
    website: 'op.fi',
    type: 'credit-union',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Insurance']
  },
  {
    id: 'danske-bank-finland',
    name: 'Danske Bank Finland',
    country: 'Finland',
    continent: 'Europe',
    color: '#003755',
    website: 'danskebank.fi',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Poland
  {
    id: 'pko-bank-polski',
    name: 'PKO Bank Polski',
    country: 'Poland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'pkobp.pl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'bank-pekao',
    name: 'Bank Pekao',
    country: 'Poland',
    continent: 'Europe',
    color: '#009639',
    website: 'pekao.com.pl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'mbank-poland',
    name: 'mBank',
    country: 'Poland',
    continent: 'Europe',
    color: '#cc0000',
    website: 'mbank.pl',
    type: 'digital',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Investment', 'Business Banking']
  },
  {
    id: 'ing-poland',
    name: 'ING Bank Śląski',
    country: 'Poland',
    continent: 'Europe',
    color: '#ff6200',
    website: 'ing.pl',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },

  // Portugal
  {
    id: 'caixa-geral',
    name: 'Caixa Geral de Depósitos',
    country: 'Portugal',
    continent: 'Europe',
    color: '#003d7a',
    website: 'cgd.pt',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'millennium-bcp',
    name: 'Millennium BCP',
    country: 'Portugal',
    continent: 'Europe',
    color: '#0066cc',
    website: 'millenniumbcp.pt',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'novo-banco',
    name: 'Novo Banco',
    country: 'Portugal',
    continent: 'Europe',
    color: '#ff6600',
    website: 'novobanco.pt',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'santander-portugal',
    name: 'Santander Totta',
    country: 'Portugal',
    continent: 'Europe',
    color: '#ec0000',
    website: 'santander.pt',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Greece
  {
    id: 'national-bank-greece',
    name: 'National Bank of Greece',
    country: 'Greece',
    continent: 'Europe',
    color: '#003d7a',
    website: 'nbg.gr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'alpha-bank',
    name: 'Alpha Bank',
    country: 'Greece',
    continent: 'Europe',
    color: '#0066cc',
    website: 'alpha.gr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'eurobank',
    name: 'Eurobank',
    country: 'Greece',
    continent: 'Europe',
    color: '#003d7a',
    website: 'eurobank.gr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'piraeus-bank',
    name: 'Piraeus Bank',
    country: 'Greece',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'piraeusbank.gr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },

  // Ireland
  {
    id: 'aib',
    name: 'AIB (Allied Irish Banks)',
    country: 'Ireland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'aib.ie',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'bank-of-ireland',
    name: 'Bank of Ireland',
    country: 'Ireland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'bankofireland.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'ulster-bank',
    name: 'Ulster Bank',
    country: 'Ireland',
    continent: 'Europe',
    color: '#003d7a',
    website: 'ulsterbank.ie',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'permanent-tsb',
    name: 'Permanent TSB',
    country: 'Ireland',
    continent: 'Europe',
    color: '#0066cc',
    website: 'permanenttsb.ie',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Mortgages', 'Credit Cards', 'Life Insurance']
  },

  // Czech Republic
  {
    id: 'csob',
    name: 'ČSOB (Československá Obchodní Banka)',
    country: 'Czech Republic',
    continent: 'Europe',
    color: '#0066cc',
    website: 'csob.cz',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'ceska-sporitelna',
    name: 'Česká Spořitelna',
    country: 'Czech Republic',
    continent: 'Europe',
    color: '#003d7a',
    website: 'csas.cz',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'komercni-banka',
    name: 'Komerční Banka',
    country: 'Czech Republic',
    continent: 'Europe',
    color: '#0066cc',
    website: 'kb.cz',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },

  // Romania
  {
    id: 'bcr',
    name: 'Banca Comercială Română (BCR)',
    country: 'Romania',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'bcr.ro',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'brd',
    name: 'BRD - Groupe Société Générale',
    country: 'Romania',
    continent: 'Europe',
    color: '#e50113',
    website: 'brd.ro',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'ing-romania',
    name: 'ING Bank Romania',
    country: 'Romania',
    continent: 'Europe',
    color: '#ff6200',
    website: 'ing.ro',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },

  // Hungary
  {
    id: 'otp-bank',
    name: 'OTP Bank',
    country: 'Hungary',
    continent: 'Europe',
    color: '#00a651',
    website: 'otpbank.hu',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Business Banking']
  },
  {
    id: 'k-h-bank',
    name: 'K&H Bank',
    country: 'Hungary',
    continent: 'Europe',
    color: '#0066cc',
    website: 'kh.hu',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'erste-hungary',
    name: 'Erste Bank Hungary',
    country: 'Hungary',
    continent: 'Europe',
    color: '#e2001a',
    website: 'erstebank.hu',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },

  // Luxembourg
  {
    id: 'bcee',
    name: 'Banque et Caisse d\'Épargne de l\'État (BCEE)',
    country: 'Luxembourg',
    continent: 'Europe',
    color: '#003d7a',
    website: 'bcee.lu',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Investment', 'Private Banking', 'Mortgages']
  },
  {
    id: 'bil',
    name: 'Banque Internationale à Luxembourg (BIL)',
    country: 'Luxembourg',
    continent: 'Europe',
    color: '#0066cc',
    website: 'bil.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Private Banking', 'Investment', 'Wealth Management']
  },

  // Turkey
  {
    id: 'ziraat-bank',
    name: 'Ziraat Bankası',
    country: 'Turkey',
    continent: 'Europe',
    color: '#e30613',
    website: 'ziraatbank.com.tr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Agricultural Banking', 'Mortgages']
  },
  {
    id: 'vakifbank',
    name: 'VakıfBank',
    country: 'Turkey',
    continent: 'Europe',
    color: '#ffcc00',
    website: 'vakifbank.com.tr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Investment']
  },
  {
    id: 'halkbank',
    name: 'Halkbank',
    country: 'Turkey',
    continent: 'Europe',
    color: '#0099cc',
    website: 'halkbank.com.tr',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'SME Banking', 'Mortgages']
  },

  // Japan
  {
    id: 'mitsubishi-ufj',
    name: 'Mitsubishi UFJ Financial Group',
    country: 'Japan',
    continent: 'Asia',
    color: '#e60012',
    website: 'mufg.jp',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Investment Banking', 'Corporate Banking', 'Trust Services']
  },
  {
    id: 'mizuho',
    name: 'Mizuho Bank',
    country: 'Japan',
    continent: 'Asia',
    color: '#0066cc',
    website: 'mizuho-fg.com',
    type: 'retail',
    products: ['Savings', 'Corporate Banking', 'Investment Banking', 'Securities', 'Trust Services']
  },
  {
    id: 'sumitomo-mitsui',
    name: 'Sumitomo Mitsui Banking Corporation',
    country: 'Japan',
    continent: 'Asia',
    color: '#009639',
    website: 'smbc.co.jp',
    type: 'retail',
    products: ['Savings', 'Corporate Banking', 'Investment Banking', 'Leasing', 'Securities']
  },

  // China
  {
    id: 'icbc',
    name: 'Industrial and Commercial Bank of China (ICBC)',
    country: 'China',
    continent: 'Asia',
    color: '#c8102e',
    website: 'icbc.com.cn',
    type: 'retail',
    products: ['Savings', 'Corporate Banking', 'Investment Banking', 'Credit Cards', 'International']
  },
  {
    id: 'china-construction-bank',
    name: 'China Construction Bank',
    country: 'China',
    continent: 'Asia',
    color: '#003087',
    website: 'ccb.com',
    type: 'retail',
    products: ['Savings', 'Corporate Banking', 'Investment Banking', 'Infrastructure Finance', 'Housing']
  },
  {
    id: 'bank-of-china',
    name: 'Bank of China',
    country: 'China',
    continent: 'Asia',
    color: '#c8102e',
    website: 'boc.cn',
    type: 'retail',
    products: ['Savings', 'International Banking', 'Trade Finance', 'Investment Banking', 'Foreign Exchange']
  },

  // Australia
  {
    id: 'commonwealth-bank',
    name: 'Commonwealth Bank of Australia',
    country: 'Australia',
    continent: 'Oceania',
    color: '#ffcc00',
    website: 'commbank.com.au',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Investment', 'Business Banking']
  },
  {
    id: 'westpac',
    name: 'Westpac',
    country: 'Australia',
    continent: 'Oceania',
    color: '#da020e',
    website: 'westpac.com.au',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Investment', 'Business Banking']
  },
  {
    id: 'anz',
    name: 'Australia and New Zealand Banking Group (ANZ)',
    country: 'Australia',
    continent: 'Oceania',
    color: '#005092',
    website: 'anz.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Investment', 'International Banking']
  },
  {
    id: 'nab',
    name: 'National Australia Bank (NAB)',
    country: 'Australia',
    continent: 'Oceania',
    color: '#e60028',
    website: 'nab.com.au',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Business Banking', 'Wealth Management']
  },

  // India
  {
    id: 'sbi',
    name: 'State Bank of India (SBI)',
    country: 'India',
    continent: 'Asia',
    color: '#1f4788',
    website: 'sbi.co.in',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Home Loans', 'Investment']
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    country: 'India',
    continent: 'Asia',
    color: '#004c8f',
    website: 'hdfcbank.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Investment', 'Digital Banking']
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    country: 'India',
    continent: 'Asia',
    color: '#f37f20',
    website: 'icicibank.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Home Loans', 'Investment', 'Corporate Banking']
  },

  // Brazil
  {
    id: 'itau',
    name: 'Itaú Unibanco',
    country: 'Brazil',
    continent: 'South America',
    color: '#ff6900',
    website: 'itau.com.br',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Investment', 'Corporate Banking', 'Insurance']
  },
  {
    id: 'bradesco',
    name: 'Banco Bradesco',
    country: 'Brazil',
    continent: 'South America',
    color: '#cc092f',
    website: 'bradesco.com.br',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Investment', 'Insurance', 'Digital Banking']
  },
  {
    id: 'banco-do-brasil',
    name: 'Banco do Brasil',
    country: 'Brazil',
    continent: 'South America',
    color: '#ffcc00',
    website: 'bb.com.br',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Agricultural Banking', 'Corporate Banking', 'Government Banking']
  },

  // United Arab Emirates
  {
    id: 'fab',
    name: 'First Abu Dhabi Bank (FAB)',
    country: 'United Arab Emirates',
    continent: 'Asia',
    color: '#005eb8',
    website: 'bankfab.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'emirates-nbd',
    name: 'Emirates NBD',
    country: 'United Arab Emirates',
    continent: 'Asia',
    color: '#003399',
    website: 'emiratesnbd.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Priority Banking']
  },
  {
    id: 'adcb',
    name: 'Abu Dhabi Commercial Bank (ADCB)',
    country: 'United Arab Emirates',
    continent: 'Asia',
    color: '#c62026',
    website: 'adcb.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Mortgages', 'Wealth Management']
  },
  {
    id: 'dib',
    name: 'Dubai Islamic Bank',
    country: 'United Arab Emirates',
    continent: 'Asia',
    color: '#006c35',
    website: 'dib.ae',
    type: 'retail',
    products: ['Islamic Banking', 'Savings', 'Credit Cards', 'Auto Finance', 'Home Finance']
  },
  {
    id: 'mashreq',
    name: 'Mashreq Bank',
    country: 'United Arab Emirates',
    continent: 'Asia',
    color: '#ff5e00',
    website: 'mashreqbank.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Digital Banking', 'Investment']
  },

  // Saudi Arabia
  {
    id: 'al-rajhi',
    name: 'Al Rajhi Bank',
    country: 'Saudi Arabia',
    continent: 'Asia',
    color: '#004d99',
    website: 'alrajhibank.com.sa',
    type: 'retail',
    products: ['Islamic Banking', 'Current Account', 'Credit Cards', 'Finance', 'Investment']
  },
  {
    id: 'snb',
    name: 'Saudi National Bank (SNB)',
    country: 'Saudi Arabia',
    continent: 'Asia',
    color: '#006c35',
    website: 'alahli.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Finance', 'Investment']
  },
  {
    id: 'riyad-bank',
    name: 'Riyad Bank',
    country: 'Saudi Arabia',
    continent: 'Asia',
    color: '#005596',
    website: 'riyadbank.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Finance', 'Corporate Banking']
  },
  {
    id: 'sab',
    name: 'Saudi Awwal Bank (SAB)',
    country: 'Saudi Arabia',
    continent: 'Asia',
    color: '#d71920',
    website: 'sab.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Home Finance', 'Private Banking']
  },

  // Kuwait
  {
    id: 'nbk',
    name: 'National Bank of Kuwait (NBK)',
    country: 'Kuwait',
    continent: 'Asia',
    color: '#005eb8',
    website: 'nbk.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'kfh',
    name: 'Kuwait Finance House (KFH)',
    country: 'Kuwait',
    continent: 'Asia',
    color: '#006f44',
    website: 'kfh.com',
    type: 'retail',
    products: ['Islamic Banking', 'Savings', 'Credit Cards', 'Auto Finance', 'Real Estate']
  },
  {
    id: 'gulf-bank',
    name: 'Gulf Bank',
    country: 'Kuwait',
    continent: 'Asia',
    color: '#c62026',
    website: 'e-gulfbank.com',
    type: 'retail',
    products: ['Current Account', 'Savings', 'Credit Cards', 'Loans', 'Priority Banking']
  },

  // Thailand
  {
    id: 'bangkok-bank',
    name: 'Bangkok Bank',
    country: 'Thailand',
    continent: 'Asia',
    color: '#1e4597',
    website: 'bangkokbank.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Investment', 'Business Banking']
  },
  {
    id: 'kasikornbank',
    name: 'Kasikornbank (KBank)',
    country: 'Thailand',
    continent: 'Asia',
    color: '#138f2d',
    website: 'kasikornbank.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Investment', 'Digital Banking']
  },
  {
    id: 'scb',
    name: 'Siam Commercial Bank (SCB)',
    country: 'Thailand',
    continent: 'Asia',
    color: '#4e2583',
    website: 'scb.co.th',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Investment', 'Wealth Management']
  },
  {
    id: 'krungthai',
    name: 'Krungthai Bank',
    country: 'Thailand',
    continent: 'Asia',
    color: '#00a5e5',
    website: 'krungthai.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Government Services', 'Investment']
  },

  // Vietnam
  {
    id: 'vietcombank',
    name: 'Vietcombank',
    country: 'Vietnam',
    continent: 'Asia',
    color: '#005a3c',
    website: 'vietcombank.com.vn',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Digital Banking', 'International']
  },
  {
    id: 'vietinbank',
    name: 'VietinBank',
    country: 'Vietnam',
    continent: 'Asia',
    color: '#005a9e',
    website: 'vietinbank.vn',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'SME Banking', 'Trade Finance']
  },
  {
    id: 'bidv',
    name: 'BIDV',
    country: 'Vietnam',
    continent: 'Asia',
    color: '#203e90',
    website: 'bidv.com.vn',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Insurance', 'Investment']
  },
  {
    id: 'techcombank',
    name: 'Techcombank',
    country: 'Vietnam',
    continent: 'Asia',
    color: '#e31937',
    website: 'techcombank.com.vn',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Loans', 'Priority Banking', 'Business Banking']
  },

  // Philippines
  {
    id: 'bdo',
    name: 'BDO Unibank',
    country: 'Philippines',
    continent: 'Asia',
    color: '#003399',
    website: 'bdo.com.ph',
    type: 'retail',
    products: ['Savings', 'Checking', 'Credit Cards', 'Loans', 'Remittance']
  },
  {
    id: 'bpi',
    name: 'Bank of the Philippine Islands (BPI)',
    country: 'Philippines',
    continent: 'Asia',
    color: '#b2003d',
    website: 'bpi.com.ph',
    type: 'retail',
    products: ['Savings', 'Checking', 'Credit Cards', 'Loans', 'Asset Management']
  },
  {
    id: 'metrobank',
    name: 'Metrobank',
    country: 'Philippines',
    continent: 'Asia',
    color: '#003399',
    website: 'metrobank.com.ph',
    type: 'retail',
    products: ['Savings', 'Checking', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'landbank',
    name: 'Landbank',
    country: 'Philippines',
    continent: 'Asia',
    color: '#006633',
    website: 'landbank.com',
    type: 'retail',
    products: ['Savings', 'Loans', 'Government Banking', 'Agrarian Services', 'Digital Banking']
  },

  // Malaysia
  {
    id: 'maybank',
    name: 'Maybank',
    country: 'Malaysia',
    continent: 'Asia',
    color: '#ffc425',
    website: 'maybank2u.com.my',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Islamic Banking']
  },
  {
    id: 'cimb',
    name: 'CIMB Bank',
    country: 'Malaysia',
    continent: 'Asia',
    color: '#ed1c24',
    website: 'cimb.com.my',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Wealth Management']
  },
  {
    id: 'public-bank',
    name: 'Public Bank',
    country: 'Malaysia',
    continent: 'Asia',
    color: '#d31145',
    website: 'pbebank.com',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'rhb',
    name: 'RHB Bank',
    country: 'Malaysia',
    continent: 'Asia',
    color: '#0067b1',
    website: 'rhbgroup.com',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Insurance']
  },

  // Indonesia
  {
    id: 'bank-mandiri',
    name: 'Bank Mandiri',
    country: 'Indonesia',
    continent: 'Asia',
    color: '#003d79',
    website: 'bankmandiri.co.id',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Micro Banking']
  },
  {
    id: 'bri',
    name: 'Bank Rakyat Indonesia (BRI)',
    country: 'Indonesia',
    continent: 'Asia',
    color: '#00529c',
    website: 'bri.co.id',
    type: 'retail',
    products: ['Savings', 'Loans', 'Microfinance', 'Credit Cards', 'Digital Banking']
  },
  {
    id: 'bca',
    name: 'Bank Central Asia (BCA)',
    country: 'Indonesia',
    continent: 'Asia',
    color: '#00529c',
    website: 'bca.co.id',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Digital Banking']
  },
  {
    id: 'bni',
    name: 'Bank Negara Indonesia (BNI)',
    country: 'Indonesia',
    continent: 'Asia',
    color: '#f15a22',
    website: 'bni.co.id',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'International']
  },

  // Russia
  {
    id: 'sberbank',
    name: 'Sberbank',
    country: 'Russia',
    continent: 'Europe',
    color: '#21a038',
    website: 'sberbank.ru',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Ecosystem Services']
  },
  {
    id: 'vtb',
    name: 'VTB Bank',
    country: 'Russia',
    continent: 'Europe',
    color: '#002882',
    website: 'vtb.ru',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Investment']
  },
  {
    id: 'alfa-bank',
    name: 'Alfa-Bank',
    country: 'Russia',
    continent: 'Europe',
    color: '#ef3124',
    website: 'alfabank.ru',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Business Banking']
  },
  {
    id: 'tinkoff',
    name: 'Tinkoff Bank',
    country: 'Russia',
    continent: 'Europe',
    color: '#ffdd2d',
    website: 'tinkoff.ru',
    type: 'digital',
    products: ['Digital Banking', 'Investment', 'Credit Cards', 'Business Banking', 'Insurance']
  },
  {
    id: 'gazprombank',
    name: 'Gazprombank',
    country: 'Russia',
    continent: 'Europe',
    color: '#004899',
    website: 'gazprombank.ru',
    type: 'retail',
    products: ['Savings', 'Current Account', 'Credit Cards', 'Loans', 'Corporate Banking']
  },

  // Additional China Banks
  {
    id: 'agbank-china',
    name: 'Agricultural Bank of China',
    country: 'China',
    continent: 'Asia',
    color: '#00917a',
    website: 'abchina.com',
    type: 'retail',
    products: ['Savings', 'Corporate Banking', 'Rural Banking', 'Credit Cards', 'Investment']
  },
  {
    id: 'cmb',
    name: 'China Merchants Bank',
    country: 'China',
    continent: 'Asia',
    color: '#c8102e',
    website: 'cmbchina.com',
    type: 'retail',
    products: ['Savings', 'Credit Cards', 'Wealth Management', 'Corporate Banking', 'Private Banking']
  },

  // Digital Banks / Fintech
  {
    id: 'revolut',
    name: 'Revolut',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#0075eb',
    website: 'revolut.com',
    type: 'digital',
    products: ['Digital Banking', 'Multi-Currency', 'Cryptocurrency', 'Investment', 'Business Banking']
  },
  {
    id: 'n26',
    name: 'N26',
    country: 'Germany',
    continent: 'Europe',
    color: '#00d4aa',
    website: 'n26.com',
    type: 'digital',
    products: ['Digital Banking', 'Savings', 'Investment', 'Insurance', 'Premium Accounts']
  },
  {
    id: 'monzo',
    name: 'Monzo',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#ff5733',
    website: 'monzo.com',
    type: 'digital',
    products: ['Digital Current Account', 'Savings', 'Budgeting Tools', 'Business Banking']
  },
  {
    id: 'starling',
    name: 'Starling Bank',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#6c2c91',
    website: 'starlingbank.com',
    type: 'digital',
    products: ['Digital Current Account', 'Savings', 'Business Banking', 'Marketplace']
  },
  {
    id: 'chime',
    name: 'Chime',
    country: 'United States',
    continent: 'North America',
    color: '#00d4aa',
    website: 'chime.com',
    type: 'digital',
    products: ['Digital Checking', 'Savings', 'Early Pay', 'Credit Building', 'Fee-Free Banking']
  },
  {
    id: 'wise',
    name: 'Wise (formerly TransferWise)',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#9fe870',
    website: 'wise.com',
    type: 'digital',
    products: ['Multi-Currency Account', 'International Transfers', 'Debit Card', 'Business Account', 'Low Fees']
  },
  {
    id: 'bunq',
    name: 'bunq',
    country: 'Netherlands',
    continent: 'Europe',
    color: '#00d4aa',
    website: 'bunq.com',
    type: 'digital',
    products: ['Digital Banking', 'Multi-Currency', 'Savings', 'Investment', 'Eco-Friendly Banking']
  },
  {
    id: 'paypal',
    name: 'PayPal',
    country: 'United States',
    continent: 'North America',
    color: '#003087',
    website: 'paypal.com',
    type: 'digital',
    products: ['Digital Wallet', 'P2P Payments', 'Business Solutions', 'Credit', 'Savings']
  },
  {
    id: 'venmo',
    name: 'Venmo',
    country: 'United States',
    continent: 'North America',
    color: '#3d95ce',
    website: 'venmo.com',
    type: 'digital',
    products: ['P2P Payments', 'Debit Card', 'Credit Card', 'Digital Wallet', 'Social Payments']
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    country: 'United States',
    continent: 'North America',
    color: '#00d632',
    website: 'cash.app',
    type: 'digital',
    products: ['P2P Payments', 'Debit Card', 'Bitcoin', 'Stocks', 'Direct Deposit']
  },
  {
    id: 'sofi',
    name: 'SoFi',
    country: 'United States',
    continent: 'North America',
    color: '#00adef',
    website: 'sofi.com',
    type: 'digital',
    products: ['High-Yield Checking', 'Savings', 'Investment', 'Personal Loans', 'Student Loans']
  },
  {
    id: 'varo',
    name: 'Varo Bank',
    country: 'United States',
    continent: 'North America',
    color: '#5e3aee',
    website: 'varobank.com',
    type: 'digital',
    products: ['Digital Checking', 'High-Yield Savings', 'Early Pay', 'Cash Advances', 'No Fees']
  },
  {
    id: 'current',
    name: 'Current',
    country: 'United States',
    continent: 'North America',
    color: '#000000',
    website: 'current.com',
    type: 'digital',
    products: ['Digital Banking', 'Teen Banking', 'Early Pay', 'Savings Pods', 'Cryptocurrency']
  },
  {
    id: 'nubank',
    name: 'Nubank',
    country: 'Brazil',
    continent: 'South America',
    color: '#820ad1',
    website: 'nubank.com.br',
    type: 'digital',
    products: ['Digital Banking', 'Credit Cards', 'Personal Loans', 'Investment', 'Insurance']
  },
  {
    id: 'transferwise-japan',
    name: 'Wise Japan',
    country: 'Japan',
    continent: 'Asia',
    color: '#9fe870',
    website: 'wise.com/jp',
    type: 'digital',
    products: ['Multi-Currency', 'International Transfers', 'Debit Card', 'Low Fees']
  },
  {
    id: 'monese',
    name: 'Monese',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#0069ff',
    website: 'monese.com',
    type: 'digital',
    products: ['Digital Banking', 'Multi-Currency', 'International Transfers', 'Savings']
  },
  {
    id: 'curve',
    name: 'Curve',
    country: 'United Kingdom',
    continent: 'Europe',
    color: '#000000',
    website: 'curve.com',
    type: 'digital',
    products: ['Payment Aggregator', 'Rewards', 'Multi-Card Management', 'Travel Money']
  }
];

// Helper functions for bank operations
export const getBanksByCountry = (country: string): BankInfo[] => {
  return INTERNATIONAL_BANKS.filter(bank => 
    bank.country.toLowerCase().includes(country.toLowerCase())
  );
};

export const getBanksByContinent = (continent: string): BankInfo[] => {
  return INTERNATIONAL_BANKS.filter(bank => 
    bank.continent.toLowerCase().includes(continent.toLowerCase())
  );
};

export const searchBanks = (query: string): BankInfo[] => {
  const lowercaseQuery = query.toLowerCase();
  
  // Filter banks that match the query
  const matches = INTERNATIONAL_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(lowercaseQuery) ||
    bank.country.toLowerCase().includes(lowercaseQuery) ||
    bank.continent.toLowerCase().includes(lowercaseQuery) ||
    bank.type.toLowerCase().includes(lowercaseQuery)
  );
  
  // Sort by relevance: exact name matches first, then country matches, then others
  return matches.sort((a, b) => {
    const aNameMatch = a.name.toLowerCase().includes(lowercaseQuery);
    const bNameMatch = b.name.toLowerCase().includes(lowercaseQuery);
    const aCountryMatch = a.country.toLowerCase().includes(lowercaseQuery);
    const bCountryMatch = b.country.toLowerCase().includes(lowercaseQuery);
    
    // Exact name match gets highest priority
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    // Country match gets second priority
    if (aCountryMatch && !bCountryMatch) return -1;
    if (!aCountryMatch && bCountryMatch) return 1;
    
    // Sort by name alphabetically if same priority
    return a.name.localeCompare(b.name);
  });
};

export const getBankById = (id: string): BankInfo | undefined => {
  return INTERNATIONAL_BANKS.find(bank => bank.id === id);
};

export const getAllCountries = (): string[] => {
  const countries = new Set<string>();
  INTERNATIONAL_BANKS.forEach(bank => countries.add(bank.country));
  return Array.from(countries).sort();
};

export const getAllContinents = (): string[] => {
  const continents = new Set<string>();
  INTERNATIONAL_BANKS.forEach(bank => continents.add(bank.continent));
  return Array.from(continents).sort();
};
