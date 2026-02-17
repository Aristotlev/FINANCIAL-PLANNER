/**
 * SEC RSS Feed API - Latest Filings
 *
 * PERMANENT STORAGE MODEL:
 *   - Ticker-specific feeds: ALWAYS served from DB, background sync when TTL expires
 *   - Global RSS feed (no ticker): still hits SEC RSS (real-time stream)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSECEdgarClient, FilingType, getFormTypeDescription, SECRSSItem, SECFiling } from '@/lib/api/sec-edgar-api';
import { secCacheService } from '@/lib/sec-cache-service';
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
    const forceRefresh = searchParams.get('refresh') === 'true';

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
    let source: 'db' | 'sec-edgar' = 'sec-edgar';

    if (ticker) {
      // ── Company-specific: DB-first ─────────────────────────────
      // Resolve company (DB-first)
      const cachedCompany = await secCacheService.getCompanyByTicker(ticker);
      let company = cachedCompany.data;

      if (!company) {
        company = await secApi.getCIKByTicker(ticker);
        if (company) {
          secCacheService.upsertCompanies([company]).catch(() => {});
        }
      }

      if (company) {
        const companyName = company.name;
        const formTypes = formType ? [formType] : undefined;

        // Try permanent DB data first
        const cachedFilings = !forceRefresh
          ? await secCacheService.getFilings(company.cik, { formTypes, limit })
          : null;

        if (cachedFilings && cachedFilings.data.length > 0) {
          source = 'db';

          // Background sync if TTL expired
          if (cachedFilings.needsBackgroundRefresh) {
            secApi.getCompanyFilings(company.cik, formTypes).then(allFilings => {
              if (allFilings.length > 0) {
                secCacheService.writeFilings(company.cik, allFilings).catch(() => {});
              }
            }).catch(() => {});
          }

          filings = cachedFilings.data.slice(0, limit).map(f => ({
            title: `${f.form} - ${companyName}`,
            company: companyName,
            reportingPerson: '',
            formType: f.form,
            formDescription: getFormTypeDescription(f.form),
            link: f.filingDetailUrl || f.primaryDocumentUrl,
            pubDate: f.filingDate,
            pubDateFormatted: new Date(f.filingDate).toLocaleDateString(),
            description: `${f.form} filing for ${companyName}`,
          }));
        } else {
          // Fallback: fetch from SEC RSS feed
          const items = await secApi.getCompanyFilingsFeed(company.cik);

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
      }
    } else {
      // ── Global feed: always hits SEC RSS (real-time stream) ─────
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
      _source: source,
    }, {
      headers: {
        ...limiter.headers,
        'Cache-Control': source === 'db' ? 'public, s-maxage=60, stale-while-revalidate=300' : 'public, max-age=60',
        'X-Data-Source': source === 'db' ? 'cache' : 'fresh',
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
