import { NextRequest, NextResponse } from 'next/server';

// Subscription pricing database with current prices
// Updated regularly to reflect current market prices
const SUBSCRIPTION_PRICES: Record<string, { amount: number; billing_cycle: string; updated: string }> = {
  // Entertainment & Streaming
  'Netflix': { amount: 15.49, billing_cycle: 'monthly', updated: '2024-10' },
  'Disney+': { amount: 13.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Hulu': { amount: 17.99, billing_cycle: 'monthly', updated: '2024-10' },
  'HBO Max': { amount: 15.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Max': { amount: 15.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Amazon Prime Video': { amount: 8.99, billing_cycle: 'monthly', updated: '2024-10' },
  'YouTube Premium': { amount: 13.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Apple TV+': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Paramount+': { amount: 11.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Peacock': { amount: 11.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Music
  'Spotify': { amount: 11.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Apple Music': { amount: 10.99, billing_cycle: 'monthly', updated: '2024-10' },
  'YouTube Music': { amount: 10.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Tidal': { amount: 10.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Amazon Music Unlimited': { amount: 10.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Productivity & Cloud
  'Microsoft 365': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Google One': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'iCloud+': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Dropbox': { amount: 11.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Notion': { amount: 10.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Evernote': { amount: 14.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Adobe Creative Cloud
  'Adobe Creative Cloud': { amount: 59.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Adobe Photoshop': { amount: 22.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Adobe Lightroom': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Adobe Premiere Pro': { amount: 22.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Canva Pro': { amount: 14.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Figma': { amount: 15.00, billing_cycle: 'monthly', updated: '2024-10' },
  
  // AI Tools
  'ChatGPT Plus': { amount: 20.00, billing_cycle: 'monthly', updated: '2024-10' },
  'ChatGPT Pro': { amount: 200.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Claude Pro': { amount: 20.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Gemini Advanced': { amount: 19.99, billing_cycle: 'monthly', updated: '2024-10' },
  'GitHub Copilot': { amount: 10.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Midjourney': { amount: 30.00, billing_cycle: 'monthly', updated: '2024-10' },
  'ElevenLabs': { amount: 22.00, billing_cycle: 'monthly', updated: '2024-10' },
  'HeyGen': { amount: 29.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Runway ML': { amount: 15.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Jasper AI': { amount: 49.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Copy.ai': { amount: 49.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Grammarly Premium': { amount: 12.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Perplexity Pro': { amount: 20.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Grok': { amount: 8.00, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Gaming
  'Xbox Game Pass Ultimate': { amount: 19.99, billing_cycle: 'monthly', updated: '2024-10' },
  'PlayStation Plus': { amount: 17.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Nintendo Switch Online': { amount: 3.99, billing_cycle: 'monthly', updated: '2024-10' },
  'EA Play': { amount: 4.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Fitness & Health
  'Planet Fitness': { amount: 24.99, billing_cycle: 'monthly', updated: '2024-10' },
  'LA Fitness': { amount: 34.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Peloton': { amount: 44.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Apple Fitness+': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Headspace': { amount: 12.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Calm': { amount: 14.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // News & Reading
  'The New York Times': { amount: 17.00, billing_cycle: 'monthly', updated: '2024-10' },
  'The Washington Post': { amount: 12.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Medium': { amount: 5.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Kindle Unlimited': { amount: 11.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Audible': { amount: 14.95, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Developer Tools
  'GitHub Pro': { amount: 4.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Replit Core': { amount: 20.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Linear': { amount: 10.00, billing_cycle: 'monthly', updated: '2024-10' },
  'AWS': { amount: 50.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Google Cloud': { amount: 50.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Heroku': { amount: 7.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Vercel': { amount: 20.00, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Communication
  'Slack': { amount: 8.00, billing_cycle: 'monthly', updated: '2024-10' },
  'Zoom': { amount: 14.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Discord Nitro': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  
  // VPN & Security
  'NordVPN': { amount: 12.99, billing_cycle: 'monthly', updated: '2024-10' },
  'ExpressVPN': { amount: 12.95, billing_cycle: 'monthly', updated: '2024-10' },
  '1Password': { amount: 7.99, billing_cycle: 'monthly', updated: '2024-10' },
  'LastPass': { amount: 3.00, billing_cycle: 'monthly', updated: '2024-10' },
  
  // Food & Delivery
  'DoorDash DashPass': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Uber One': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
  'Instacart+': { amount: 9.99, billing_cycle: 'monthly', updated: '2024-10' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 });
    }

    // Find exact or close match
    const exactMatch = SUBSCRIPTION_PRICES[name];
    if (exactMatch) {
      return NextResponse.json({
        name,
        ...exactMatch,
        source: 'database'
      });
    }

    // Try fuzzy match
    const lowerName = name.toLowerCase();
    const fuzzyMatch = Object.entries(SUBSCRIPTION_PRICES).find(([key]) =>
      key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())
    );

    if (fuzzyMatch) {
      return NextResponse.json({
        name: fuzzyMatch[0],
        ...fuzzyMatch[1],
        source: 'database'
      });
    }

    return NextResponse.json({
      error: 'Price not found',
      message: `No pricing data available for "${name}"`
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching subscription price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription price' },
      { status: 500 }
    );
  }
}

// Batch endpoint for multiple subscriptions
export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json();

    if (!Array.isArray(names)) {
      return NextResponse.json({ error: 'Names must be an array' }, { status: 400 });
    }

    const results = names.map(name => {
      const exactMatch = SUBSCRIPTION_PRICES[name];
      if (exactMatch) {
        return { name, ...exactMatch, found: true };
      }

      const lowerName = name.toLowerCase();
      const fuzzyMatch = Object.entries(SUBSCRIPTION_PRICES).find(([key]) =>
        key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())
      );

      if (fuzzyMatch) {
        return { name: fuzzyMatch[0], ...fuzzyMatch[1], found: true };
      }

      return { name, found: false };
    });

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error in batch subscription pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription prices' },
      { status: 500 }
    );
  }
}
