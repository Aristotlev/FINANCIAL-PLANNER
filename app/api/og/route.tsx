import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const title = searchParams.get("title") || "Portfolio";
    const value = searchParams.get("value") || "0";
    const currency = searchParams.get("currency") || "$";
    const user = searchParams.get("user") || "User";
    const change = searchParams.get("change") || "0%";
    
    // Net Worth specific
    const assets = searchParams.get("assets") || "0";
    const liabilities = searchParams.get("liabilities") || "0";
    
    // Portfolio specific
    const theme = searchParams.get("theme") || "#f59e0b";
    const holdingsParam = searchParams.get("holdings");

    // Post specific
    const content = searchParams.get("content") || "";
    const userImage = searchParams.get("userImage");
    const date = searchParams.get("date");
    
    let holdings: any[] = [];
    try {
      holdings = holdingsParam ? JSON.parse(holdingsParam) : [];
    } catch (e) {
      console.error("Failed to parse holdings", e);
    }

    // Format number helper
    const formatNum = (numStr: string) => {
      const num = parseFloat(numStr);
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    };

    const { protocol, host } = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}//${host}`;
    const logoUrl = `${baseUrl}/images/logo.png`;

    if (type === 'post') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#030712', // gray-950
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '1000px',
                height: '550px',
                backgroundColor: '#111827', // gray-900
                borderRadius: '24px',
                padding: '48px',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #1f2937',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Background Gradients */}
              <div
                style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '400px',
                  height: '400px',
                  borderRadius: '50%',
                  background: '#3b82f6', // blue-500
                  opacity: 0.1,
                  filter: 'blur(80px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-100px',
                  left: '-100px',
                  width: '400px',
                  height: '400px',
                  borderRadius: '50%',
                  background: '#8b5cf6', // violet-500
                  opacity: 0.1,
                  filter: 'blur(80px)',
                }}
              />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {userImage && (
                    <img
                      src={userImage}
                      alt={user}
                      width="64"
                      height="64"
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{user}</span>
                    {date && <span style={{ fontSize: '16px', color: '#9ca3af' }}>{date}</span>}
                  </div>
                </div>
                
                {/* Branding */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={logoUrl}
                    alt="Omnifolio"
                    width="48"
                    height="48"
                    style={{ objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Omnifolio</span>
                </div>
              </div>

              {/* Content */}
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ 
                  fontSize: '32px', 
                  color: '#e5e7eb', 
                  lineHeight: '1.4',
                  maxHeight: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {content}
                </p>
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    // If no type is specified AND no specific data is passed (default app preview)
    if (!type && !searchParams.get("title") && !searchParams.get("value") && !searchParams.get("holdings")) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#030712',
            }}
          >
            <img
              src={logoUrl}
              alt="Omnifolio"
              width="250"
              height="250"
              style={{ objectFit: 'contain' }}
            />
            <div style={{ 
              fontSize: '80px', 
              fontWeight: 'bold', 
              color: 'white',
              marginTop: '30px',
              fontFamily: 'sans-serif'
            }}>
              Omnifolio
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    const isNetWorth = type === 'net-worth';
    const bgColor = isNetWorth ? '#9333ea' : theme;
    const secondaryColor = isNetWorth ? '#2563eb' : theme;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#030712', // gray-950
            fontFamily: 'sans-serif',
          }}
        >
          {/* Card Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '1000px',
              height: '550px',
              backgroundColor: '#111827', // gray-900
              borderRadius: '24px',
              padding: '48px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #1f2937',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Background Gradients */}
            <div
              style={{
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: bgColor,
                opacity: 0.2,
                filter: 'blur(80px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-100px',
                left: '-100px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: secondaryColor,
                opacity: 0.2,
                filter: 'blur(80px)',
              }}
            />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Logo Icon */}
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>Omnifolio</span>
                </div>
                <span style={{ fontSize: '16px', color: '#9ca3af', marginLeft: '4px', marginTop: '4px' }}>Financial Analytics</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</span>
                <span style={{ fontSize: '20px', fontWeight: '600', color: 'white' }}>{user}</span>
              </div>
            </div>

            {/* Main Value */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'auto' }}>
              <span style={{ fontSize: '18px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isNetWorth ? 'Total Net Worth' : title}
              </span>
              <span style={{ fontSize: '72px', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                {currency}{formatNum(value)}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: change.includes('+') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: change.includes('+') ? '#4ade80' : '#f87171',
                  fontSize: '16px',
                  fontWeight: '500',
                  alignSelf: 'flex-start',
                  marginTop: '8px'
                }}
              >
                {change} This Month
              </div>
            </div>

            {/* Footer Stats */}
            <div style={{ display: 'flex', width: '100%', paddingTop: '32px', borderTop: '1px solid #1f2937', gap: '48px' }}>
              {isNetWorth ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>Assets</span>
                    <span style={{ fontSize: '28px', fontWeight: '600', color: '#60a5fa' }}>{currency}{formatNum(assets)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>Liabilities</span>
                    <span style={{ fontSize: '28px', fontWeight: '600', color: '#f87171' }}>{currency}{formatNum(liabilities)}</span>
                  </div>
                </>
              ) : (
                holdings.slice(0, 3).map((holding: any, index: number) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: holding.color || theme }} />
                      <span style={{ fontSize: '16px', color: '#9ca3af' }}>{holding.symbol}</span>
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: '600', color: theme }}>
                      {currency}{formatNum(holding.value)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
