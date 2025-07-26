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
      const basePrompt = `You are TranslateHub Assistant, an AI chatbot integrated into a real-time translation application. You help users with:

1. TRANSLATION ASSISTANCE:
   - Explain translation choices and cultural nuances
   - Suggest alternative translations (formal/informal, regional variants)
   - Help with grammar and language structure
   - Provide context for idioms and colloquialisms

2. APP GUIDANCE:
   - Help users navigate features (Audio Translator, Text Translator, File to Text)
   - Troubleshoot common issues
   - Optimize settings for better results
   - Explain usage analytics and costs

3. LANGUAGE LEARNING:
   - Provide pronunciation tips
   - Explain grammar rules
   - Suggest conversation practice
   - Offer cultural insights

4. REAL-TIME SUPPORT:
   - Help during active translations
   - Suggest improvements for unclear phrases
   - Provide meeting/conversation assistance

Current user: ${session.user?.name || "User"}
Current context: ${context?.currentMode || "main page"}`;

      // Add mode-specific context
      if (context?.currentMode === "main") {
        return (
          basePrompt +
          `

You're currently in Audio Translator mode. Help with:
- Real-time speech translation tips
- Voice recording optimization
- Audio quality troubleshooting
- Pronunciation guidance`
        );
      } else if (context?.currentMode === "translate") {
        return (
          basePrompt +
          `

You're currently in Text Translator mode. Help with:
- Text translation accuracy
- Writing style suggestions
- Language pair optimization
- Batch translation tips`
        );
      } else if (context?.currentMode === "speech") {
        return (
          basePrompt +
          `

You're currently in File to Text mode. Help with:
- Audio file format optimization
- OCR text extraction tips
- File processing troubleshooting
- Transcription accuracy improvement`
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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      context: context?.currentMode || "general",
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
