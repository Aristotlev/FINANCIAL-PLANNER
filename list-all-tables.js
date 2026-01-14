
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Listing all tables in public schema...');
  
  // We can't directly list tables with supabase-js client unless we use rpc or have a specific function
  // But we can try to query common table names to see if they exist
  
  const potentialTables = [
    'crypto_holdings',
    'crypto_transactions',
    'transactions',
    'stock_holdings',
    'cash_accounts',
    'savings_accounts',
    'trading_accounts',
    'real_estate',
    'valuable_items',
    'income_sources',
    'subscriptions',
    'debt_accounts',
    'expense_categories',
    'tax_profiles',
    'user_preferences'
  ];
  
  for (const table of potentialTables) {
    const { data, error } = await supabase
      .from(table)
      .select('count', { count: 'exact', head: true });
      
    if (!error) {
      console.log(`✅ Table "${table}": EXISTS`);
    } else {
      if (error.code === '42P01') { // undefined_table
        console.log(`❌ Table "${table}": DOES NOT EXIST`);
      } else {
        console.log(`⚠️ Table "${table}": Error ${error.code} - ${error.message}`);
      }
    }
  }
}

listTables();
