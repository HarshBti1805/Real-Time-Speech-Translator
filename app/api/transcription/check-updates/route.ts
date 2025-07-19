import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Lightweight endpoint to check for updates since a given timestamp
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");

  try {
    const sinceDate = since ? new Date(since) : null;
    const isValidDate = sinceDate && !isNaN(sinceDate.getTime());

    const query = {
      where: {
        userId: user.id,
        ...(isValidDate && { createdAt: { gt: sinceDate } }),
      },
      orderBy: { createdAt: "desc" as const },
      take: 10, // Limit to recent transcriptions
    };

    const transcriptions = await prisma.transcription.findMany(query);

    return NextResponse.json({
      hasUpdates: transcriptions.length > 0,
      count: transcriptions.length,
      latest: transcriptions[0]?.createdAt || null,
      transcriptions: since ? transcriptions : [], // Only return full data if checking for updates
    });
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json(
      { error: "Failed to check updates" },
      { status: 500 }
    );
  }
}
