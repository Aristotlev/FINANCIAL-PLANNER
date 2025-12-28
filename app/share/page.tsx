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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.omnifolio.app';
  const ogUrl = `${baseUrl}/api/og?${queryString.toString()}`;

  const user = (params.user as string) || 'A user';
  const type = (params.type as string) || 'Financial Card';
  const value = (params.value as string) || '0';
  const currency = (params.currency as string) || '$';
  
  const displayTitle = `${user}'s ${type === 'net-worth' ? 'Net Worth' : 'Portfolio'} on Omnifolio`;
  const displayDescription = `Check out ${user}'s financial progress! They shared their ${type === 'net-worth' ? 'Net Worth' : 'Portfolio'} of ${currency}${value} on Omnifolio.`;

  return {
    title: displayTitle,
    description: displayDescription,
    openGraph: {
      title: displayTitle,
      description: displayDescription,
      images: [ogUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: displayDescription,
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
