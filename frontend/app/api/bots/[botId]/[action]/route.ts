import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string; action: string }> }
) {
  const { apiBaseUrl } = await request.json();
  try {
    const response = await fetch(`${apiBaseUrl}/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: `Bot restarted successfully`,
      data,
    });
  } catch (error) {
    console.error("Error communicating with the backend service:", error);
    return NextResponse.json(
      {
        error: "Failed to communicate with the backend service",
        message: error,
      },
      { status: 500 }
    );
  }
}
