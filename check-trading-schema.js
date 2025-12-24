const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking trading_accounts table columns...');
  
  // Try to insert a dummy record to get an error with column names, 
  // or select * limit 0 to get structure if possible (but JS client returns data, not schema usually)
  // Better approach: Query information_schema if possible, but RLS might block.
  // Let's try to select one record.
  
  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting:', error);
  } else {
    console.log('Data sample:', data);
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot infer columns from data.');
    }
  }
}

checkTable();
