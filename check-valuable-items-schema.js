
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Checking valuable_items table columns...');
  
  // Try to insert a dummy record to get a column error, or just select one row
  const { data, error } = await supabase
    .from('valuable_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching valuable_items:', error);
  } else {
    if (data && data.length > 0) {
      console.log('Columns found in first row:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot infer columns from data.');
      // If empty, we can try to insert a dummy record with a known bad column to see the error message listing valid columns
      // But better, let's try to infer from the error message the user got, or just assume standard mapping.
      // Actually, I can try to get the definition if I had access to information_schema, but RLS might block it.
    }
  }
}

checkColumns();
