/**
 * SEC RSS Feed API - Latest Filings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, FilingType, getFormTypeDescription, SECRSSItem, SECFiling } from '@/lib/api/sec-edgar-api';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiter';

const secApi = createSECEdgarClient();

// Helper to extract accession number from SEC link
function extractAccessionNumber(link: string): string | null {
  const match = link.match(/(\d{10}-\d{2}-\d{6})/);
  return match ? match[1] : null;
}

// GET /api/sec/feed?formType=8-K&limit=40
export async function GET(request: NextRequest) {
  const limiter = withRateLimit(request, RateLimitPresets.STANDARD);
  if (!limiter.success) {
    return limiter.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const formType = searchParams.get('formType') as FilingType | null;
    const limit = parseInt(searchParams.get('limit') || '40');
    const ticker = searchParams.get('ticker');

    interface Form4Summary {
      totalBought: number;
      totalSold: number;
      totalValue: number;
      ownerTitle: string;
    }

    interface FilingResult {
      title: string;
      company: string;
      reportingPerson: string;
      formType: string;
      formDescription: string;
      link: string;
      pubDate: string;
      pubDateFormatted: string;
      description: string;
      form4Summary?: Form4Summary;
    }

    let filings: FilingResult[] = [];

    if (ticker) {
      // If ticker is provided, get filings for that specific company
      const company = await secApi.getCIKByTicker(ticker);
      
      if (company) {
        const companyName = company.name;
        
        // Get company filings feed
        const items = await secApi.getCompanyFilingsFeed(company.cik);
        
        // Filter by form type if specified
        const filteredItems = formType 
          ? items.filter(item => {
              const titleForm = item.title.split(' - ')[0].trim();
              return titleForm === formType || titleForm === `${formType}/A`;
            })
          : items;
        
        // For Form 4 filings, try to get insider names and transaction details
        let form4Map: Map<string, { name: string; summary: Form4Summary }> = new Map();
        const hasForm4 = filteredItems.some(item => {
          const titleForm = item.title.split(' - ')[0].trim();
          return titleForm === '4' || titleForm === '4/A';
        });
        
        if (hasForm4) {
          try {
            // Get insider transactions (this parses the actual Form 4 XML files)
            const form4Filings = await secApi.getInsiderTransactions(company.cik, 365);
            form4Filings.forEach(f => {
              const txs = f.transactions;
              const totalBought = txs.filter(t => t.transactionCode === 'P' || t.isAcquisition).reduce((sum, t) => sum + t.sharesAmount, 0);
              const totalSold = txs.filter(t => t.transactionCode === 'S' || (!t.isAcquisition && t.transactionCode !== 'P' && t.transactionCode !== 'A' && t.transactionCode !== 'M' && t.transactionCode !== 'G')).reduce((sum, t) => sum + t.sharesAmount, 0);
              const totalValue = txs.reduce((sum, t) => sum + (t.sharesAmount * (t.pricePerShare || 0)), 0);
              const ownerTitle = f.reportingOwner.officerTitle || (f.reportingOwner.isDirector ? 'Director' : 'Insider');
              
              form4Map.set(f.accessionNumber, {
                name: f.reportingOwner.name,
                summary: { totalBought, totalSold, totalValue, ownerTitle }
              });
            });
          } catch (e) {
            console.error('[SEC API] Failed to get insider transactions:', e);
          }
        }
        
        filings = filteredItems.slice(0, limit).map(item => {
          const parts = item.title.split(' - ');
          const form = parts[0]?.trim() || 'Unknown';
          let reportingPerson = '';
          let form4Summary: Form4Summary | undefined;
          
          // Check if this is a Form 4 and get the insider name and transaction data
          if (form === '4' || form === '4/A') {
            const accNum = extractAccessionNumber(item.link);
            if (accNum && form4Map.has(accNum)) {
              const data = form4Map.get(accNum)!;
              reportingPerson = data.name;
              form4Summary = data.summary;
            }
          }
          
          return {
            title: item.title,
            company: companyName,
            reportingPerson,
            formType: form,
            formDescription: getFormTypeDescription(form),
            link: item.link,
            pubDate: item.pubDate,
            pubDateFormatted: new Date(item.pubDate).toLocaleDateString(),
            description: item.description,
            form4Summary,
          };
        });
      }
    } else {
      // Get latest filings from RSS feed (global)
      const items = await secApi.getLatestFilings(formType || undefined);
      
      filings = items.slice(0, limit).map(item => {
        let form = 'Unknown';
        let company = '';
        let reportingPerson = '';
        
        const parts = item.title.split(' - ');
        if (parts.length >= 2) {
          form = parts[0].trim();
          const rest = parts.slice(1).join(' - ');
          const cikMatch = rest.match(/\((\d{10})\)/);
          
          if (cikMatch && cikMatch.index !== undefined) {
            const namePart = rest.substring(0, cikMatch.index).trim();
            
            if ((form === '4' || form === '4/A') && rest.includes('(Reporting)')) {
              reportingPerson = namePart;
            } else {
              company = namePart;
            }
          } else {
            company = rest;
          }
        }
        
        return {
          title: item.title,
          company,
          reportingPerson,
          formType: form,
          formDescription: getFormTypeDescription(form),
          link: item.link,
          pubDate: item.pubDate,
          pubDateFormatted: new Date(item.pubDate).toLocaleDateString(),
          description: item.description,
        };
      });
    }

    return NextResponse.json({
      filings,
      count: filings.length,
      formType: formType || 'all',
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        ...limiter.headers,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('[SEC API] Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEC feed' },
      { status: 500 }
    );
  }
}
