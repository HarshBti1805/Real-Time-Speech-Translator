import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available navigation sections
const AVAILABLE_SECTIONS = {
  main: {
    name: "Main Page",
    description: "Audio translator, speech recognition, real-time translation",
    keywords: [
      "audio translator",
      "speech translator",
      "audio",
      "main",
      "home",
      "start",
      "begin",
    ],
  },
  translate: {
    name: "Text Translator",
    description: "Text translation, language conversion, written text",
    keywords: [
      "text translator",
      "text",
      "translate",
      "language",
      "convert",
      "written",
    ],
  },
  fileupload: {
    name: "File Upload",
    description: "Upload files, documents, media files",
    keywords: [
      "file upload",
      "upload",
      "media upload",
      "file",
      "document",
      "upload file",
    ],
  },
  voicerecording: {
    name: "OCR/Camera",
    description: "OCR, camera, visual recognition, image to text",
    keywords: [
      "ocr",
      "visual ocr",
      "camera",
      "scan",
      "image",
      "picture",
      "visual",
    ],
  },
  dashboard: {
    name: "Dashboard",
    description: "Analytics, statistics, user dashboard, overview",
    keywords: [
      "dashboard",
      "analytics",
      "stats",
      "statistics",
      "overview",
      "summary",
    ],
  },
};

export async function POST(request: NextRequest) {
  try {
    const { voiceCommand } = await request.json();

    if (!voiceCommand) {
      return NextResponse.json(
        { error: "Voice command is required" },
        { status: 400 }
      );
    }

    // Create a comprehensive prompt for the AI
    const systemPrompt = `You are a smart voice navigation assistant. Your job is to understand what the user wants to do and map it to the correct section of the application.

Available sections:
${Object.entries(AVAILABLE_SECTIONS)
  .map(([key, section]) => `- ${section.name} (${key}): ${section.description}`)
  .join("\n")}

Instructions:
1. Analyze the user's voice command and determine their intent
2. Return ONLY a JSON object with this exact structure:
   {
     "section": "section_key",
     "confidence": 0.95,
     "reasoning": "brief explanation of why this section was chosen",
     "alternative_sections": ["other_possible_sections"]
   }

3. The section_key must be one of: ${Object.keys(AVAILABLE_SECTIONS).join(", ")}
4. Confidence should be between 0.0 and 1.0
5. If the command is unclear or doesn't match any section, use "main" as default
6. Consider synonyms, natural language, and user intent, not just exact keywords

Examples:
- "I want to translate some text" → translate
- "Take me to the main page" → main  
- "Upload a file" → fileupload
- "Use the camera" → voicerecording
- "Show me my stats" → dashboard
- "Go home" → main
- "I need to scan something" → voicerecording

User command: "${voiceCommand}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for faster response
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: voiceCommand,
        },
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistent results
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error("Failed to parse AI response:", response, parseError);
      // Fallback to keyword matching
      return NextResponse.json({
        section: "main",
        confidence: 0.5,
        reasoning: "Fallback to main page due to parsing error",
        alternative_sections: [],
      });
    }

    // Validate the response
    if (
      !parsedResponse.section ||
      !AVAILABLE_SECTIONS[
        parsedResponse.section as keyof typeof AVAILABLE_SECTIONS
      ]
    ) {
      console.warn("AI returned invalid section:", parsedResponse.section);
      parsedResponse.section = "main";
      parsedResponse.confidence = 0.5;
      parsedResponse.reasoning = "Invalid section returned, defaulting to main";
    }

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      available_sections: AVAILABLE_SECTIONS,
    });
  } catch (error) {
    console.error("Voice navigation error:", error);
    return NextResponse.json(
      {
        error: "Failed to process voice command",
        section: "main",
        confidence: 0.0,
        reasoning: "Error occurred, defaulting to main page",
      },
      { status: 500 }
    );
  }
}
