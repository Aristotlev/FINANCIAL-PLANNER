#!/usr/bin/env node

/**
 * Google Maps API Key Validator
 * Tests your API key and checks which APIs are enabled
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
let API_KEY = '';
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.+)/);
  if (match) {
    API_KEY = match[1].trim();
  }
} catch (err) {
  // .env.local not found or couldn't read
}

console.log('🔑 Google Maps API Key Validator\n');
console.log('================================\n');

if (!API_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found in .env.local');
  console.error('\nPlease add your API key to .env.local:');
  console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here\n');
  process.exit(1);
}

console.log(`✅ API Key found: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);
console.log('Testing API endpoints...\n');

// Test Maps JavaScript API
function testMapsJavaScriptAPI() {
  return new Promise((resolve) => {
    const url = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Maps JavaScript API: Working');
          resolve(true);
        } else {
          console.log(`❌ Maps JavaScript API: Error (Status: ${res.statusCode})`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ Maps JavaScript API: ${err.message}`);
      resolve(false);
    });
  });
}

// Test Geocoding API
function testGeocodingAPI() {
  return new Promise((resolve) => {
    const address = encodeURIComponent('Austin, TX');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.status === 'OK') {
          console.log('✅ Geocoding API: Working');
          resolve(true);
        } else if (json.status === 'REQUEST_DENIED') {
          console.log(`❌ Geocoding API: ${json.error_message || 'Access denied'}`);
          resolve(false);
        } else {
          console.log(`⚠️  Geocoding API: ${json.status}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ Geocoding API: ${err.message}`);
      resolve(false);
    });
  });
}

// Test Places API
function testPlacesAPI() {
  return new Promise((resolve) => {
    const query = encodeURIComponent('restaurants in Austin');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.status === 'OK' || json.status === 'ZERO_RESULTS') {
          console.log('✅ Places API: Working');
          resolve(true);
        } else if (json.status === 'REQUEST_DENIED') {
          console.log(`❌ Places API: ${json.error_message || 'Access denied'}`);
          resolve(false);
        } else {
          console.log(`⚠️  Places API: ${json.status}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ Places API: ${err.message}`);
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  const results = await Promise.all([
    testMapsJavaScriptAPI(),
    testGeocodingAPI(),
    testPlacesAPI()
  ]);

  console.log('\n================================\n');
  
  const allPassed = results.every(r => r === true);
  
  if (allPassed) {
    console.log('🎉 All APIs are working correctly!');
    console.log('\nYou can now use the map location picker.');
    console.log('Visit: http://localhost:3000/test-map');
  } else {
    console.log('⚠️  Some APIs failed the test.');
    console.log('\nTroubleshooting:');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Enable these APIs:');
    console.log('   - Maps JavaScript API');
    console.log('   - Geocoding API');
    console.log('   - Places API');
    console.log('3. Check API key restrictions');
    console.log('4. Ensure billing is enabled');
  }
  
  console.log('\n');
}

runTests().catch(console.error);
