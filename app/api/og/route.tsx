import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Read the logo image file
  const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
  let logoBase64 = ''
  
  try {
    const logoBuffer = await readFile(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch (error) {
    console.warn('Logo file not found for OG image')
  }

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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            {logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoBase64}
                alt="OmniFolio Logo"
                width="150"
                height="150"
                style={{ marginRight: 24, objectFit: 'contain' }}
              />
            ) : (
              /* Fallback SVG if logo is missing */
              <svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                style={{ marginRight: 24 }}
              >
                <defs>
                  <linearGradient id="ogGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="url(#ogGradient)" />
                <path d="M 50 50 L 10 50 A 40 40 0 0 1 50 10 Z" fill="#06b6d4" opacity="0.8" />
                <rect x="25" y="55" width="10" height="25" rx="2" fill="#4ade80" />
                <rect x="40" y="40" width="10" height="40" rx="2" fill="#22d3ee" />
                <rect x="55" y="25" width="10" height="55" rx="2" fill="#a78bfa" />
                <rect x="70" y="15" width="12" height="65" rx="2" fill="#7c3aed" />
                <path d="M 20 60 L 32 72 L 48 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 15 75 Q 50 70 85 30" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
              </svg>
            )}

            {/* Logo Text */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #3b82f6)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              OmniFolio
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: '#94a3b8',
              textAlign: 'center',
              maxWidth: 800,
              display: 'flex',
            }}
          >
            All-in-One Financial Management Dashboard
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              marginTop: 48,
              gap: 16,
            }}
          >
            {['Crypto', 'Stocks', 'Real Estate', 'Expenses', 'Net Worth'].map((feature, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 24px',
                  borderRadius: 9999,
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#c4b5fd',
                  fontSize: 18,
                  fontWeight: 500,
                  display: 'flex',
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #3b82f6)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
