import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// NOTE: The Transcription model requires a successful migration and client generation.th

// GET: Fetch all transcriptions for the logged-in user
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
  const transcriptions = await prisma.transcription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(transcriptions);
}

// POST: Save a new transcription for the logged-in user
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
  const { inputType, inputValue, outputValue } = await req.json();
  if (!inputType || !inputValue || !outputValue) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const transcription = await prisma.transcription.create({
    data: {
      userId: user.id,
      inputType,
      inputValue,
      outputValue,
    },
  });
  return NextResponse.json(transcription, { status: 201 });
}

// DELETE: Delete a transcription by id for the logged-in user
export async function DELETE(req: NextRequest) {
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
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  // Only allow deleting user's own transcription
  const deleted = await prisma.transcription.deleteMany({
    where: { id, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json(
      { error: "Transcription not found or not allowed" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
