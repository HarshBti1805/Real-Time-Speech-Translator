import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Fetch user analytics
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
  const period = searchParams.get("period") || "30"; // days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  try {
    // Get analytics for the specified period
    const analytics = await prisma.analytics.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Get transcription history for the period
    const transcriptionHistory = await prisma.transcription.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get translation history for the period
    const translationHistory = await prisma.translationHistory.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Combine both histories
    const allTranslations = [
      ...transcriptionHistory.map((item) => ({
        id: item.id,
        sourceText: item.inputValue || "",
        translatedText: item.outputValue,
        sourceLanguage: "auto",
        targetLanguage: "en",
        date: item.createdAt.toISOString(),
        inputType: item.inputType,
        inputValue: item.inputValue,
        outputValue: item.outputValue,
        createdAt: item.createdAt.toISOString(),
      })),
      ...translationHistory.map((item) => ({
        id: item.id,
        sourceText: item.sourceText,
        translatedText: item.translatedText,
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
        date: item.createdAt.toISOString(),
        inputType: item.translationType,
        inputValue: item.sourceText,
        outputValue: item.translatedText,
        createdAt: item.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary statistics
    const totalTranslations = allTranslations.length;
    const totalWords = allTranslations.reduce((sum, item) => {
      const words = item.translatedText.split(/\s+/).length;
      return sum + words;
    }, 0);
    const totalCharacters = allTranslations.reduce((sum, item) => {
      return sum + item.translatedText.length;
    }, 0);

    const summary = {
      totalTranslations,
      totalWords,
      totalCharacters,
      averageWordsPerTranslation:
        totalTranslations > 0 ? totalWords / totalTranslations : 0,
      period,
      analytics,
      recentTranslations: allTranslations.slice(0, 10), // Last 10 translations
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// POST: Create or update analytics entry
export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const {
    translationsCount,
    wordsTranslated,
    charactersTranslated,
    totalCost,
    mostUsedSourceLanguage,
    mostUsedTargetLanguage,
    averageAccuracy,
    sessionDuration,
  } = body;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if analytics entry exists for today
    const existingAnalytics = await prisma.analytics.findFirst({
      where: {
        userId: user.id,
        date: today,
      },
    });

    if (existingAnalytics) {
      // Update existing entry
      const analytics = await prisma.analytics.update({
        where: {
          id: existingAnalytics.id,
        },
        data: {
          translationsCount: {
            increment: translationsCount || 0,
          },
          wordsTranslated: {
            increment: wordsTranslated || 0,
          },
          charactersTranslated: {
            increment: charactersTranslated || 0,
          },
          totalCost: {
            increment: totalCost || 0,
          },
          mostUsedSourceLanguage,
          mostUsedTargetLanguage,
          averageAccuracy,
          sessionDuration,
        },
      });
      return NextResponse.json(analytics);
    } else {
      // Create new entry
      const analytics = await prisma.analytics.create({
        data: {
          userId: user.id,
          date: today,
          translationsCount: translationsCount || 0,
          wordsTranslated: wordsTranslated || 0,
          charactersTranslated: charactersTranslated || 0,
          totalCost: totalCost || 0,
          mostUsedSourceLanguage,
          mostUsedTargetLanguage,
          averageAccuracy,
          sessionDuration,
        },
      });
      return NextResponse.json(analytics);
    }
  } catch (error) {
    console.error("Error creating analytics:", error);
    return NextResponse.json(
      { error: "Failed to create analytics" },
      { status: 500 }
    );
  }
}
