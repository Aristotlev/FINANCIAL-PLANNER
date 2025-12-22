'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, Suspense } from 'react';

function GoogleAnalyticsContent({ GA_MEASUREMENT_ID, GA_ADS_ID }: { GA_MEASUREMENT_ID: string, GA_ADS_ID?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('config', GA_MEASUREMENT_ID, {
            page_path: url,
        });
    }
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            
            // Set default consent to 'denied'
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied'
            });

            gtag('js', new Date());

            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
            ${GA_ADS_ID ? `gtag('config', '${GA_ADS_ID}');` : ''}
          `,
        }}
      />
    </>
  );
}

export default function GoogleAnalytics(props: { GA_MEASUREMENT_ID: string, GA_ADS_ID?: string }) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsContent {...props} />
    </Suspense>
  );
}
