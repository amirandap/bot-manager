import { NextResponse } from "next/server"
import type { Bot } from "@/lib/types"

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiUrl) {
    return NextResponse.json({ error: 'API base URL is not defined' }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiUrl}/api/bots`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message }, { status: response.status });
    }

    const bots: Bot[] = await response.json();
    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error communicating with the backend service:', error);
    return NextResponse.json({ error: 'Failed to communicate with the backend service' }, { status: 500 });
  }
}

