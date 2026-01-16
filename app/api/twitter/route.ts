import { NextRequest, NextResponse } from 'next/server';

// Twitter API v2 configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';

// Target accounts to fetch tweets from (IDs or Usernames)
const TARGET_ACCOUNTS = {
  trump: '25073877', // Donald Trump
  elonmusk: '44196397', // Elon Musk
  federalreserve: 'federalreserve', // Federal Reserve
  pompliano: 'APompliano', // Anthony Pompliano
  dalio: 'RayDalio', // Ray Dalio
  burry: 'michaeljburry', // Michael Burry
};

// Alternative usernames to try
const TARGET_USERNAMES = ['realDonaldTrump', 'elonmusk'];

// Keywords for filtering politics, geopolitics, and finance content
const FILTER_KEYWORDS = [
  // Politics
  'politics', 'president', 'congress', 'senate', 'election', 'vote', 'campaign',
  'democrat', 'republican', 'gop', 'liberal', 'conservative', 'government',
  'legislation', 'policy', 'maga', 'america first', 'biden', 'trump',
  'white house', 'capitol', 'supreme court', 'bill', 'law', 'regulation',
  
  // Geopolitics
  'china', 'russia', 'ukraine', 'nato', 'eu', 'europe', 'asia', 'middle east',
  'war', 'conflict', 'sanctions', 'tariff', 'trade war', 'diplomacy', 'treaty',
  'border', 'immigration', 'military', 'defense', 'nuclear', 'alliance',
  'iran', 'israel', 'gaza', 'taiwan', 'north korea', 'putin', 'xi',
  
  // Finance & Economy
  'economy', 'stock', 'market', 'crypto', 'bitcoin', 'doge', 'dogecoin', 'tesla',
  'inflation', 'fed', 'federal reserve', 'interest rate', 'gdp', 'recession',
  'tax', 'tariff', 'trade', 'dollar', 'currency', 'investment', 'investor',
  'wall street', 'nasdaq', 'dow', 's&p', 'sec', 'bank', 'banking',
  'spacex', 'twitter', 'x corp', 'business', 'company', 'corporation',
  'oil', 'energy', 'gold', 'commodity', 'price', 'billion', 'trillion',
  'job', 'employment', 'unemployment', 'wage', 'debt', 'deficit', 'budget',
  'starlink', 'neuralink', 'grok', 'ai', 'artificial intelligence',
  'd.o.g.e', 'department of government efficiency'
];

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_profile_image?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count: number;
    impression_count: number;
  };
  is_relevant: boolean;
  matched_keywords: string[];
}

interface TwitterApiResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics?: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
      bookmark_count: number;
      impression_count: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    }>;
  };
  meta?: {
    next_token?: string;
    result_count: number;
  };
  errors?: Array<{
    message: string;
    code: number;
  }>;
}

// Get OAuth 2.0 Bearer Token using client credentials
async function getBearerToken(): Promise<string | null> {
  try {
    const credentials = Buffer.from(`${TWITTER_API_KEY}:${TWITTER_API_SECRET}`).toString('base64');
    
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get bearer token:', error);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting bearer token:', error);
    return null;
  }
}

// Filter tweets based on relevance to politics, geopolitics, and finance
function filterTweet(text: string): { isRelevant: boolean; matchedKeywords: string[] } {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  
  for (const keyword of FILTER_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  
  return {
    isRelevant: matchedKeywords.length > 0,
    matchedKeywords
  };
}

// Fetch tweets from a specific user
async function fetchUserTweets(
  bearerToken: string,
  userId: string,
  startTime?: string,
  maxResults: number = 100
): Promise<TwitterApiResponse> {
  const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
  url.searchParams.set('max_results', Math.min(maxResults, 100).toString());
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
  url.searchParams.set('user.fields', 'name,username,profile_image_url');
  url.searchParams.set('expansions', 'author_id');
  
  if (startTime) {
    url.searchParams.set('start_time', startTime);
  }
  
  // Exclude retweets but allow replies as Elon often posts important content in replies
  // We rely on keyword filtering to ensure relevance
  url.searchParams.set('exclude', 'retweets');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
    },
    cache: 'no-store', // Disable cache for real-time updates
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to fetch tweets for user ${userId}:`, error);
    return { data: [], errors: [{ message: error, code: response.status }] };
  }

  return response.json();
}

// Fetch user ID by username
async function getUserIdByUsername(bearerToken: string, username: string): Promise<string | null> {
  const response = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}`,
    {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    }
  );

  if (!response.ok) {
    console.error(`Failed to get user ID for ${username}`);
    return null;
  }

  const data = await response.json();
  return data.data?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    // Check for API credentials
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Twitter API credentials not configured',
        tweets: [],
      }, { status: 500 });
    }

    // Get bearer token
    const bearerToken = await getBearerToken();
    if (!bearerToken) {
      return NextResponse.json({
        success: false,
        error: 'Failed to authenticate with Twitter API',
        tweets: [],
      }, { status: 401 });
    }

    // Calculate start time (24 hours ago)
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch tweets from all accounts
    const allTweets: Tweet[] = [];
    
    for (const [accountName, idOrUsername] of Object.entries(TARGET_ACCOUNTS)) {
      try {
        let userId = idOrUsername;

        // If it looks like a username (not all digits), resolve it to an ID
        if (!/^\d+$/.test(idOrUsername)) {
          console.log(`Resolving username ${idOrUsername} to ID...`);
          const resolvedId = await getUserIdByUsername(bearerToken, idOrUsername);
          if (resolvedId) {
            userId = resolvedId;
          } else {
            console.warn(`Could not resolve user ID for username: ${idOrUsername}`);
            continue;
          }
        }

        const response = await fetchUserTweets(bearerToken, userId, startTime);
        
        if (response.data && response.data.length > 0) {
          const userMap = new Map<string, { name: string; username: string; profile_image_url?: string }>();
          
          if (response.includes?.users) {
            for (const user of response.includes.users) {
              userMap.set(user.id, user);
            }
          }
          
          for (const tweet of response.data) {
            const { isRelevant, matchedKeywords } = filterTweet(tweet.text);
            const user = userMap.get(tweet.author_id);
            
            allTweets.push({
              id: tweet.id,
              text: tweet.text,
              created_at: tweet.created_at,
              author_id: tweet.author_id,
              author_name: user?.name || accountName,
              author_username: user?.username || accountName,
              author_profile_image: user?.profile_image_url,
              public_metrics: tweet.public_metrics,
              is_relevant: isRelevant,
              matched_keywords: matchedKeywords,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching tweets for ${accountName}:`, error);
      }
    }

    // Filter only relevant tweets
    const relevantTweets = allTweets.filter(tweet => tweet.is_relevant);
    
    // Sort by date (newest first)
    relevantTweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      count: relevantTweets.length,
      total_fetched: allTweets.length,
      tweets: relevantTweets,
      last_updated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Twitter API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tweets: [],
    }, { status: 500 });
  }
}
