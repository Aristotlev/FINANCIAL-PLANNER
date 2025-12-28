
console.log('Checking environment variables...');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? 'Found' : 'Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'Found' : 'Missing');

if (url) console.log('URL starts with:', url.substring(0, 8));
if (key) console.log('Key starts with:', key.substring(0, 8));
