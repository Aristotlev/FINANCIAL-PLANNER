import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    
    // Post specific
    const content = searchParams.get("content") || "";
    const userImage = searchParams.get("userImage");
    const user = searchParams.get("user") || "User";
    const date = searchParams.get("date");
    
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
    // AND for any other type that isn't 'post'
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
            OmniFolio
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
