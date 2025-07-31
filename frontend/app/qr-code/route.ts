import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const botId = formData.get('botId') as string;

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Get the backend URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    
    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/proxy/get-qr-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ botId }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend QR code request failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to get QR code from backend' },
        { status: backendResponse.status }
      );
    }

    const contentType = backendResponse.headers.get('content-type');
    
    if (contentType?.includes('image')) {
      // If it's an image, return it directly
      const imageBuffer = await backendResponse.arrayBuffer();
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="qr-code-${botId}.png"`,
        },
      });
    } else {
      // If it's JSON (error response), return it
      const jsonResponse = await backendResponse.json();
      return NextResponse.json(jsonResponse, { status: backendResponse.status });
    }
  } catch (error) {
    console.error('QR code API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
