import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Route segment config
export const runtime = 'nodejs' // Changed from edge to nodejs for file access

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default async function Icon() {
  // Read the logo image file
  const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
  let logoBase64 = ''
  
  try {
    const logoBuffer = await readFile(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch (error) {
    // Fallback if logo file doesn't exist
    console.warn('Logo file not found, using fallback')
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={logoBase64} 
            alt="OmniFolio"
            width={32}
            height={32}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          // Fallback SVG if logo not available
          <div
            style={{
              fontSize: 24,
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #3b82f6 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            O
          </div>
        )}
      </div>
    ),
    {
      ...size,
    }
  )
}
