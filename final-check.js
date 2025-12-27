
const { TRADING_DATABASE } = require('./lib/trading-database');

const symbols = TRADING_DATABASE.map(i => i.symbol);
const uniqueSymbols = new Set(symbols);

if (symbols.length !== uniqueSymbols.size) {
  console.log('Duplicates found!');
  const duplicates = symbols.filter((item, index) => symbols.indexOf(item) !== index);
  console.log(duplicates);
} else {
  console.log('No duplicates found. Total items:', symbols.length);
}
