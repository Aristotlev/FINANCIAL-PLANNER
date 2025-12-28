import { ImageResponse } from 'next/og';import { ImageResponse } from 'next/og'

import { NextRequest } from 'next/server'

export const runtime = 'edge';import { readFile } from 'fs/promises'

import { join } from 'path'

export async function GET(request: Request) {

  try {export const runtime = 'nodejs'

    const { searchParams } = new URL(request.url);

export async function GET(request: NextRequest) {

    const type = searchParams.get("type");  // Read the logo image file

    const title = searchParams.get("title") || "Portfolio";  const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')

    const value = searchParams.get("value") || "0";  let logoBase64 = ''

    const currency = searchParams.get("currency") || "$";  

    const user = searchParams.get("user") || "User";  try {

    const change = searchParams.get("change") || "0%";    const logoBuffer = await readFile(logoPath)

        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

    // Net Worth specific  } catch (error) {

    const assets = searchParams.get("assets") || "0";    console.warn('Logo file not found for OG image')

    const liabilities = searchParams.get("liabilities") || "0";  }

    

    // Portfolio specific  return new ImageResponse(

    const theme = searchParams.get("theme") || "#f59e0b";    (

    const holdingsParam = searchParams.get("holdings");      <div

    let holdings: any[] = [];        style={{

    try {          height: '100%',

      holdings = holdingsParam ? JSON.parse(holdingsParam) : [];          width: '100%',

    } catch (e) {          display: 'flex',

      console.error("Failed to parse holdings", e);          flexDirection: 'column',

    }          alignItems: 'center',

          justifyContent: 'center',

    // Format number helper          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',

    const formatNum = (numStr: string) => {          fontFamily: 'system-ui, sans-serif',

      const num = parseFloat(numStr);        }}

      return new Intl.NumberFormat('en-US', {      >

        minimumFractionDigits: 0,        {/* Background pattern */}

        maximumFractionDigits: 2,        <div

      }).format(num);          style={{

    };            position: 'absolute',

            top: 0,

    const isNetWorth = type === 'net-worth';            left: 0,

    const bgColor = isNetWorth ? '#9333ea' : theme;            right: 0,

    const secondaryColor = isNetWorth ? '#2563eb' : theme;            bottom: 0,

            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',

    return new ImageResponse(            display: 'flex',

      (          }}

        <div        />

          style={{

            height: '100%',        {/* Main content */}

            width: '100%',        <div

            display: 'flex',          style={{

            flexDirection: 'column',            display: 'flex',

            alignItems: 'center',            flexDirection: 'column',

            justifyContent: 'center',            alignItems: 'center',

            backgroundColor: '#030712', // gray-950            justifyContent: 'center',

            fontFamily: 'sans-serif',            position: 'relative',

          }}            zIndex: 10,

        >          }}

          {/* Card Container */}        >

          <div          {/* Logo */}

            style={{          <div

              display: 'flex',            style={{

              flexDirection: 'column',              display: 'flex',

              width: '1000px',              alignItems: 'center',

              height: '550px',              marginBottom: 40,

              backgroundColor: '#111827', // gray-900            }}

              borderRadius: '24px',          >

              padding: '48px',            {logoBase64 ? (

              position: 'relative',              // eslint-disable-next-line @next/next/no-img-element

              overflow: 'hidden',              <img

              border: '1px solid #1f2937',                src={logoBase64}

              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',                alt="OmniFolio Logo"

            }}                width="150"

          >                height="150"

            {/* Background Gradients */}                style={{ marginRight: 24, objectFit: 'contain' }}

            <div              />

              style={{            ) : (

                position: 'absolute',              /* Fallback SVG if logo is missing */

                top: '-100px',              <svg

                right: '-100px',                width="120"

                width: '400px',                height="120"

                height: '400px',                viewBox="0 0 100 100"

                borderRadius: '50%',                style={{ marginRight: 24 }}

                background: bgColor,              >

                opacity: 0.2,                <defs>

                filter: 'blur(80px)',                  <linearGradient id="ogGradient" x1="0%" y1="0%" x2="100%" y2="100%">

              }}                    <stop offset="0%" stopColor="#06b6d4" />

            />                    <stop offset="50%" stopColor="#8b5cf6" />

            <div                    <stop offset="100%" stopColor="#3b82f6" />

              style={{                  </linearGradient>

                position: 'absolute',                </defs>

                bottom: '-100px',                <circle cx="50" cy="50" r="48" fill="url(#ogGradient)" />

                left: '-100px',                <path d="M 50 50 L 10 50 A 40 40 0 0 1 50 10 Z" fill="#06b6d4" opacity="0.8" />

                width: '400px',                <rect x="25" y="55" width="10" height="25" rx="2" fill="#4ade80" />

                height: '400px',                <rect x="40" y="40" width="10" height="40" rx="2" fill="#22d3ee" />

                borderRadius: '50%',                <rect x="55" y="25" width="10" height="55" rx="2" fill="#a78bfa" />

                background: secondaryColor,                <rect x="70" y="15" width="12" height="65" rx="2" fill="#7c3aed" />

                opacity: 0.2,                <path d="M 20 60 L 32 72 L 48 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

                filter: 'blur(80px)',                <path d="M 15 75 Q 50 70 85 30" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />

              }}              </svg>

            />            )}



            {/* Header */}            {/* Logo Text */}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '40px' }}>            <div

              <div style={{ display: 'flex', flexDirection: 'column' }}>              style={{

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>                fontSize: 72,

                  {/* Logo Icon */}                fontWeight: 800,

                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">                background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #3b82f6)',

                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />                backgroundClip: 'text',

                  </svg>                color: 'transparent',

                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>Omnifolio</span>                display: 'flex',

                </div>              }}

                <span style={{ fontSize: '16px', color: '#9ca3af', marginLeft: '4px', marginTop: '4px' }}>Financial Analytics</span>            >

              </div>              OmniFolio

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>            </div>

                <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</span>          </div>

                <span style={{ fontSize: '20px', fontWeight: '600', color: 'white' }}>{user}</span>

              </div>          {/* Tagline */}

            </div>          <div

            style={{

            {/* Main Value */}              fontSize: 32,

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'auto' }}>              color: '#94a3b8',

              <span style={{ fontSize: '18px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>              textAlign: 'center',

                {isNetWorth ? 'Total Net Worth' : title}              maxWidth: 800,

              </span>              display: 'flex',

              <span style={{ fontSize: '72px', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>            }}

                {currency}{formatNum(value)}          >

              </span>            All-in-One Financial Management Dashboard

              <div          </div>

                style={{

                  display: 'flex',          {/* Feature pills */}

                  alignItems: 'center',          <div

                  padding: '4px 12px',            style={{

                  borderRadius: '9999px',              display: 'flex',

                  backgroundColor: change.includes('+') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',              marginTop: 48,

                  color: change.includes('+') ? '#4ade80' : '#f87171',              gap: 16,

                  fontSize: '16px',            }}

                  fontWeight: '500',          >

                  width: 'fit-content',            {['Crypto', 'Stocks', 'Real Estate', 'Expenses', 'Net Worth'].map((feature, index) => (

                  marginTop: '8px'              <div

                }}                key={index}

              >                style={{

                {change} This Month                  padding: '12px 24px',

              </div>                  borderRadius: 9999,

            </div>                  background: 'rgba(139, 92, 246, 0.2)',

                  border: '1px solid rgba(139, 92, 246, 0.4)',

            {/* Footer Stats */}                  color: '#c4b5fd',

            <div style={{ display: 'flex', width: '100%', paddingTop: '32px', borderTop: '1px solid #1f2937', gap: '48px' }}>                  fontSize: 18,

              {isNetWorth ? (                  fontWeight: 500,

                <>                  display: 'flex',

                  <div style={{ display: 'flex', flexDirection: 'column' }}>                }}

                    <span style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>Assets</span>              >

                    <span style={{ fontSize: '28px', fontWeight: '600', color: '#60a5fa' }}>{currency}{formatNum(assets)}</span>                {feature}

                  </div>              </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>            ))}

                    <span style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>Liabilities</span>          </div>

                    <span style={{ fontSize: '28px', fontWeight: '600', color: '#f87171' }}>{currency}{formatNum(liabilities)}</span>        </div>

                  </div>

                </>        {/* Bottom gradient */}

              ) : (        <div

                holdings.slice(0, 3).map((holding: any, index: number) => (          style={{

                  <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>            position: 'absolute',

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>            bottom: 0,

                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: holding.color || theme }} />            left: 0,

                      <span style={{ fontSize: '16px', color: '#9ca3af' }}>{holding.symbol}</span>            right: 0,

                    </div>            height: 4,

                    <span style={{ fontSize: '28px', fontWeight: '600', color: theme }}>            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #3b82f6)',

                      {currency}{formatNum(holding.value)}            display: 'flex',

                    </span>          }}

                  </div>        />

                ))      </div>

              )}    ),

            </div>    {

          </div>      width: 1200,

        </div>      height: 630,

      ),    }

      {  )

        width: 1200,}

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
