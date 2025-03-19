import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { botId: string; action: string } }) {
  const { botId, action } = params;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiUrl) {
    return NextResponse.json({ error: 'API base URL is not defined' }, { status: 500 });
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Validate action
  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop".' }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiUrl}/api/bots/${botId}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: `Bot ${botId} ${action} command sent successfully`,
      data,
    });
  } catch (error) {
    console.error('Error communicating with the backend service:', error);
    return NextResponse.json({ error: 'Failed to communicate with the backend service' }, { status: 500 });
  }
}

