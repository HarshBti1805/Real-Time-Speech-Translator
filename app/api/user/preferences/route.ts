import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Fetch user preferences
export async function GET() {
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

  let preferences = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  // Create default preferences if none exist
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: {
        userId: user.id,
        favoriteSourceLanguages: ["en", "es", "fr"],
        favoriteTargetLanguages: ["es", "en", "fr"],
        defaultSourceLanguage: "en",
        defaultTargetLanguage: "es",
        theme: "dark",
        notificationsEnabled: true,
        autoSaveEnabled: true,
      },
    });
  }

  return NextResponse.json(preferences);
}

// PUT: Update user preferences
export async function PUT(req: NextRequest) {
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
    favoriteSourceLanguages,
    favoriteTargetLanguages,
    defaultSourceLanguage,
    defaultTargetLanguage,
    theme,
    notificationsEnabled,
    autoSaveEnabled,
  } = body;

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {
      favoriteSourceLanguages,
      favoriteTargetLanguages,
      defaultSourceLanguage,
      defaultTargetLanguage,
      theme,
      notificationsEnabled,
      autoSaveEnabled,
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      favoriteSourceLanguages: favoriteSourceLanguages || ["en", "es", "fr"],
      favoriteTargetLanguages: favoriteTargetLanguages || ["es", "en", "fr"],
      defaultSourceLanguage: defaultSourceLanguage || "en",
      defaultTargetLanguage: defaultTargetLanguage || "es",
      theme: theme || "dark",
      notificationsEnabled:
        notificationsEnabled !== undefined ? notificationsEnabled : true,
      autoSaveEnabled: autoSaveEnabled !== undefined ? autoSaveEnabled : true,
    },
  });

  return NextResponse.json(preferences);
}
