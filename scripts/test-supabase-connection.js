const { createClient } = require('@supabase/supabase-js');

const url = 'https://ljatyfyeqiicskahmzmp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYXR5ZnllcWlpY3NrYWhtem1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTIzNzgsImV4cCI6MjA3NTMyODM3OH0.INVALID_SIGNATURE';

console.log('Testing Supabase Connection...');
console.log('URL:', url);
console.log('Key:', key.substring(0, 20) + '...');

const supabase = createClient(url, key);

async function testConnection() {
  try {
    // Try to select from valuable_items with a dummy user_id
    // This mimics what the app does
    const { data, error } = await supabase
      .from('valuable_items')
      .select('*')
      .eq('user_id', 'sl1EBBnMN0hVPQejba0Z1Y7K84Hb8MC6')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Status:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
    } else {
      console.log('✅ Success! Data:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testConnection();
