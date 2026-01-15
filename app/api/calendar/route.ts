import { NextRequest, NextResponse } from 'next/server';

// Generic Economic Event Interface
interface EconomicEvent {
  id: string;
  date: string; // ISO Date
  time: string; // HH:mm
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  url: string; // Direct link to event details
}

// Helper to generate dates relative to today
const getRelativeDate = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Mock data generator for 7 days
const generateMockEvents = (): EconomicEvent[] => {
  const events: EconomicEvent[] = [];
  const impacts: ('High' | 'Medium' | 'Low')[] = ['Low', 'Medium', 'High'];
  
  // Each template now includes a direct URL to the Investing.com indicator page
  const eventTemplates = [
    { currency: 'USD', event: 'Fed Interest Rate Decision', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/interest-rate-decision-168' },
    { currency: 'USD', event: 'Non-Farm Payrolls', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/nonfarm-payrolls-227' },
    { currency: 'USD', event: 'CPI (YoY)', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/cpi-733' },
    { currency: 'EUR', event: 'ECB Monetary Policy Statement', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/ecb-monetary-policy-statement-1108' },
    { currency: 'GBP', event: 'BoE Interest Rate Decision', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/boe-interest-rate-decision-170' },
    { currency: 'JPY', event: 'BoJ Interest Rate Decision', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/boj-interest-rate-decision-165' },
    { currency: 'USD', event: 'Initial Jobless Claims', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/initial-jobless-claims-294' },
    { currency: 'USD', event: 'Crude Oil Inventories', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/eia-crude-oil-inventories-75' },
    { currency: 'EUR', event: 'German GDP (QoQ)', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/german-gdp-131' },
    { currency: 'GBP', event: 'Retail Sales (YoY)', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/retail-sales-256' },
    { currency: 'AUD', event: 'RBA Meeting Minutes', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/rba-meeting-minutes-391' },
    { currency: 'CAD', event: 'Employment Change', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/employment-change-82' },
    { currency: 'NZD', event: 'GDP (QoQ)', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/gdp-148' },
    { currency: 'CNY', event: 'Industrial Production (YoY)', impact: 'High' as const, url: 'https://www.investing.com/economic-calendar/chinese-industrial-production-462' },
    { currency: 'USD', event: 'PPI (MoM)', impact: 'Medium' as const, url: 'https://www.investing.com/economic-calendar/ppi-238' },
    { currency: 'BTC', event: 'Options Expiry', impact: 'Medium' as const, url: 'https://www.coinglass.com/options' },
    { currency: 'ETH', event: 'Network Upgrade', impact: 'Low' as const, url: 'https://ethereum.org/en/roadmap/' },
  ];

  for (let i = -1; i < 7; i++) { // From yesterday to next 7 days
    const date = getRelativeDate(i);
    const dayEventsCount = 3 + Math.floor(Math.random() * 5); // 3-8 events per day

    for (let j = 0; j < dayEventsCount; j++) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      // Add some randomness
      const hour = 8 + Math.floor(Math.random() * 10); // 08:00 - 18:00
      const minute = Math.random() > 0.5 ? '00' : '30';
      
      const prevVal = (Math.random() * 5).toFixed(1);
      const forecastVal = (parseFloat(prevVal) + (Math.random() - 0.5)).toFixed(1);
      // Only set actual if date is <= today
      const actualVal = i <= 0 ? (parseFloat(forecastVal) + (Math.random() - 0.5)).toFixed(1) : '';

      events.push({
        id: `${date}-${j}`,
        date: date,
        time: `${hour}:${minute}`,
        currency: template.currency,
        impact: template.impact,
        event: template.event,
        previous: `${prevVal}%`,
        forecast: `${forecastVal}%`,
        actual: actualVal ? `${actualVal}%` : '',
        url: template.url,
      });
    }
  }

  // Sort by date and time
  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
};

export async function GET(request: NextRequest) {
  // Simulator valid backend response
  const events = generateMockEvents();
  return NextResponse.json({ events });
}
