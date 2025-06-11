import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bots`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching bots:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 }
    );
  }
}
