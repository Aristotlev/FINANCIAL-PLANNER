const https = require('https');
const readline = require('readline');
const querystring = require('querystring');

// Configuration
const CLIENT_ID = 'PASTE_YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'PASTE_YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'https://www.omnifolio.app/api/auth/callback/google';

console.log('🔍 Google OAuth Credential Verifier');
console.log('===================================');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Client Secret: ${CLIENT_SECRET}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log('-----------------------------------');

// 1. Generate Auth URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + querystring.stringify({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: 'email profile',
  access_type: 'offline',
  prompt: 'consent'
});

console.log('\n1️⃣  Please visit this URL in your browser:');
console.log('\n' + authUrl + '\n');
console.log('2️⃣  After signing in, you will be redirected to a URL like:');
console.log('    ' + REDIRECT_URI + '?code=...');
console.log('    (It will show an error page on the site, that is EXPECTED)');
console.log('\n3️⃣  Copy the "code" parameter value from the address bar and paste it here:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nPaste the code here: ', (code) => {
  // Clean the code (remove URL decoding if user pasted raw URL)
  if (code.includes('code=')) {
    code = code.split('code=')[1].split('&')[0];
  }
  code = decodeURIComponent(code);

  console.log('\n🔄 Attempting to exchange code for token...');

  const postData = querystring.stringify({
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('\n📊 Response from Google:');
      console.log('-----------------------------------');
      console.log(`Status Code: ${res.statusCode}`);
      
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
        
        if (res.statusCode === 200) {
          console.log('\n✅ SUCCESS! Your credentials are VALID.');
          console.log('   The issue is likely in the application configuration or deployment.');
        } else {
          console.log('\n❌ FAILURE! Your credentials are INVALID.');
          console.log('   You MUST generate a new Client Secret in Google Cloud Console.');
        }
      } catch (e) {
        console.log('Raw Body:', data);
      }
      
      rl.close();
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    rl.close();
  });

  req.write(postData);
  req.end();
});
