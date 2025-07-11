// app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { visionClient } from "@/lib/googleClient";

// Add this import at the top if not present
// import vision from '@google-cloud/vision';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Define types for Google Vision API response
interface TextAnnotation {
  description?: string;
  boundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
}

interface DetectedLanguage {
  languageCode?: string;
  confidence?: number;
}

interface TextProperty {
  detectedLanguages?: DetectedLanguage[];
}

interface Block {
  property?: TextProperty;
  boundingBox?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
}

interface Page {
  property?: TextProperty;
  width?: number;
  height?: number;
  blocks?: Block[];
  confidence?: number;
}

interface FullTextAnnotation {
  pages?: Page[];
  text?: string;
}

interface VisionResponse {
  textAnnotations?: TextAnnotation[];
  fullTextAnnotation?: FullTextAnnotation;
}

export async function GET() {
  return NextResponse.json({ message: "OCR API is ready" });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    console.log(
      `Processing image: ${file.name}, Size: ${file.size}, Type: ${file.type}`
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBytes = buffer.toString("base64");

    // Test Vision client connection first
    try {
      const response = await visionClient.textDetection({
        image: { content: imageBytes },
      });

      // Cast the response to the expected type
      const visionResponse = response[0] as VisionResponse;

      const detections = visionResponse.textAnnotations;
      const text =
        detections && detections.length > 0
          ? detections[0].description
          : "No text found in image";

      // Additional metadata with null checks
      const metadata = {
        confidence:
          visionResponse.fullTextAnnotation?.pages?.[0]?.confidence || 0,
        detectedLanguages:
          visionResponse.fullTextAnnotation?.pages?.[0]?.property
            ?.detectedLanguages || [],
        imageSize: {
          width: visionResponse.fullTextAnnotation?.pages?.[0]?.width || 0,
          height: visionResponse.fullTextAnnotation?.pages?.[0]?.height || 0,
        },
        textBlocks:
          visionResponse.fullTextAnnotation?.pages?.[0]?.blocks?.length || 0,
      };

      console.log(`OCR successful: ${text?.substring(0, 100)}...`);

      return NextResponse.json({
        text: text || "",
        metadata,
        success: true,
      });
    } catch (visionError: unknown) {
      if (
        visionError &&
        typeof visionError === "object" &&
        "message" in visionError
      ) {
        const errorObj = visionError as {
          message?: string;
          code?: number;
          details?: string;
          stack?: string;
        };
        console.error("Google Vision API error:", {
          message: errorObj.message,
          code: errorObj.code,
          details: errorObj.details,
          stack: errorObj.stack,
        });

        // Handle specific Vision API errors
        if (errorObj.code === 12) {
          return NextResponse.json(
            {
              error:
                "Vision API service unavailable. Please check your Google Cloud configuration.",
              details:
                process.env.NODE_ENV === "development"
                  ? errorObj.message
                  : undefined,
              success: false,
            },
            { status: 503 }
          );
        }

        if (errorObj.code === 16) {
          return NextResponse.json(
            {
              error:
                "Authentication failed. Please check your Google Cloud credentials.",
              success: false,
            },
            { status: 401 }
          );
        }
      } else {
        console.error("Unknown error in Vision API:", visionError);
      }

      throw visionError; // Re-throw to be caught by outer catch
    }
  } catch (err: unknown) {
    if (err && typeof err === "object" && "message" in err) {
      const errorObj = err as {
        message?: string;
        code?: number;
        stack?: string;
      };
      console.error("OCR API error:", {
        message: errorObj.message,
        code: errorObj.code,
        stack: errorObj.stack,
      });
    } else {
      console.error("Unknown error in OCR API:", err);
    }

    return NextResponse.json(
      {
        error: "Failed to process image",
        details:
          process.env.NODE_ENV === "development"
            ? (err as Error)?.message
            : undefined,
        success: false,
      },
      { status: 500 }
    );
  }
}
