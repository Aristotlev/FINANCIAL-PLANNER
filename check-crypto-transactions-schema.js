
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking crypto_transactions schema...');
  
  const { data, error } = await supabase
    .from('crypto_transactions')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Sample row:', data[0]);
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('Table is empty, cannot infer schema from data.');
    // Try to insert a dummy row to see errors or just assume standard fields
  }
}

checkSchema();
