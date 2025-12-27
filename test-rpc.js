
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  // Use a fake UUID for testing
  const userId = '00000000-0000-0000-0000-000000000000';
  
  console.log(`Testing can_make_ai_call with user_id: ${userId}`);
  
  try {
    const { data, error } = await supabase.rpc('can_make_ai_call', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error calling can_make_ai_call:', error);
    } else {
      console.log('Success! Result:', data);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

testRpc();
