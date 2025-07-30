import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Store active connections for real-time translation
const realtimeConnections = new Map<
  string,
  ReadableStreamDefaultController[]
>();

// Function to broadcast real-time updates to user
export function broadcastRealtimeUpdate(
  userId: string,
  data: Record<string, unknown>
) {
  const userConnections = realtimeConnections.get(userId);
  if (userConnections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error("Error sending real-time SSE message:", error);
      }
    });
  }
}

// SSE endpoint for real-time translation updates
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user ID
  const prisma = await import("@/lib/prisma").then((m) => m.default);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = user.id;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the user's real-time connections
      if (!realtimeConnections.has(userId)) {
        realtimeConnections.set(userId, []);
      }
      realtimeConnections.get(userId)!.push(controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({
        type: "connected",
        message: "Real-time translation stream established",
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        const userConnections = realtimeConnections.get(userId);
        if (userConnections) {
          const index = userConnections.indexOf(controller);
          if (index > -1) {
            userConnections.splice(index, 1);
          }
          if (userConnections.length === 0) {
            realtimeConnections.delete(userId);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
