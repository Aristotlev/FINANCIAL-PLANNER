import { Metadata } from 'next';
import { ShareCard } from './share-card';
import { Suspense } from 'react';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { searchParams }: Props
): Promise<Metadata> {
  const params = await searchParams;
  const queryString = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      queryString.append(key, value);
    }
  });

  // Use absolute URL for OG image if possible, but relative works if base URL is set
  // Ideally we should use process.env.NEXT_PUBLIC_APP_URL or similar
  const ogUrl = `/api/og?${queryString.toString()}`;

  return {
    title: 'Shared Financial Card | Omnifolio',
    description: 'Check out my financial progress on Omnifolio',
    openGraph: {
      title: 'Shared Financial Card | Omnifolio',
      description: 'Check out my financial progress on Omnifolio',
      images: [ogUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shared Financial Card | Omnifolio',
      description: 'Check out my financial progress on Omnifolio',
      images: [ogUrl],
    },
  };
}

export default function SharePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShareCard />
    </Suspense>
  );
}
