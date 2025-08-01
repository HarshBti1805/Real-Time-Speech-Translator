import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatContext {
  currentMode?: string;
  currentTranslation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  recentActivity?: string[];
  conversationMode?: string;
  conversationLanguage?: string;
  systemPrompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, context, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build context-aware system prompt based on current app state
    const getSystemPrompt = (context: ChatContext) => {
      // Use custom system prompt if provided (from conversation mode)
      if (context?.systemPrompt) {
        const baseInfo = `User: ${session.user?.name || "User"} | Mode: ${
          context?.currentMode || "main"
        } | Conversation Mode: ${context?.conversationMode || "general"}`;

        // Add language preference if specified
        const languageInfo =
          context?.conversationLanguage &&
          context.conversationLanguage !== "auto"
            ? ` | Preferred Language: ${context.conversationLanguage}`
            : "";

        return `${context.systemPrompt}\n\n${baseInfo}${languageInfo}`;
      }

      const basePrompt = `You are TranslateHub Assistant. Be direct, concise, and helpful. Avoid phrases like "feel free to ask", "I'm here to help", or other redundant politeness. Give specific, actionable answers.

AREAS OF EXPERTISE:
• Translation accuracy, cultural nuances, alternatives (formal/informal, regional)
• Grammar, pronunciation, idioms, conversation practice
• App features: Audio Translator, Text Translator, File to Text
• Troubleshooting: audio quality, recording, file formats, OCR
• Language learning: pronunciation, grammar rules, cultural insights

User: ${session.user?.name || "User"} | Mode: ${
        context?.currentMode || "main"
      }`;

      // Add mode-specific context
      if (context?.currentMode === "main") {
        return (
          basePrompt +
          `\n\nCURRENT: Audio Translator - Focus on real-time speech, voice optimization, audio troubleshooting.`
        );
      } else if (context?.currentMode === "translate") {
        return (
          basePrompt +
          `\n\nCURRENT: Text Translator - Focus on text accuracy, style, language pairs, batch processing.`
        );
      } else if (context?.currentMode === "speech") {
        return (
          basePrompt +
          `\n\nCURRENT: File to Text - Focus on audio files, OCR, transcription accuracy, file formats.`
        );
      }

      return basePrompt;
    };

    // Build conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: getSystemPrompt(context),
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-10)); // Keep last 10 messages for context
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message,
    });

    // Adjust parameters based on conversation mode
    const isConversationalMode =
      context?.conversationMode && context.conversationMode !== "general";

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: isConversationalMode ? 300 : 400, // Shorter responses for conversation modes
      temperature: isConversationalMode ? 0.8 : 0.6, // More natural for conversations
      presence_penalty: 0.2, // Higher to avoid repetitive phrases
      frequency_penalty: 0.3, // Higher to encourage varied, concise language
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      context: context?.currentMode || "general",
      conversationMode: context?.conversationMode || "general",
    });
  } catch (error) {
    console.error("Chatbot API error:", error);

    if (error instanceof Error && error.message.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "TranslateHub Chatbot API",
    timestamp: new Date().toISOString(),
  });
}
