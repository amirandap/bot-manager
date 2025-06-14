import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ botId: string; action: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { botId, action } = params;

    // Validate action
    const validActions = ["start", "stop", "restart", "status"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/bots/${botId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in bot action route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string; action: string } }
) {
  try {
    const { botId, action } = params;

    // Only allow status action for GET requests
    if (action !== "status") {
      return NextResponse.json(
        { error: `GET method not allowed for action: ${action}` },
        { status: 405 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/bots/${botId}/status`);

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in bot status route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
