import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      sourceLanguage,
      targetLanguage,
      sourceText,
      translatedText,
      translationType,
      wordCount,
      characterCount,
      accuracy,
      cost,
      apiProvider = "google",
    } = await req.json();

    // Get user ID from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save to translation history
    const translationHistory = await prisma.translationHistory.create({
      data: {
        userId: user.id,
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        translationType,
        wordCount: wordCount || 0,
        characterCount: characterCount || 0,
        accuracy: accuracy || null,
        cost: cost || 0,
        apiProvider,
      },
    });

    return NextResponse.json({
      success: true,
      translationHistory,
    });
  } catch (error) {
    console.error("Error saving translation history:", error);
    return NextResponse.json(
      { error: "Failed to save translation history" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get translation history for the user
    const translationHistory = await prisma.translationHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 entries
    });

    return NextResponse.json({
      success: true,
      translationHistory,
    });
  } catch (error) {
    console.error("Error fetching translation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch translation history" },
      { status: 500 }
    );
  }
}
