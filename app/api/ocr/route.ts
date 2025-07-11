// app/api/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { visionClient } from "@/lib/googleClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

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
      const [response] = await visionClient.textDetection({
        image: { content: imageBytes },
      });

      const detections = response.textAnnotations;
      const text =
        detections && detections.length > 0
          ? detections[0].description
          : "No text found in image";

      // Additional metadata with null checks
      const metadata = {
        confidence: response.fullTextAnnotation?.pages?.[0]?.confidence || 0,
        detectedLanguages:
          response.fullTextAnnotation?.pages?.[0]?.property
            ?.detectedLanguages || [],
        imageSize: {
          width: response.fullTextAnnotation?.pages?.[0]?.width || 0,
          height: response.fullTextAnnotation?.pages?.[0]?.height || 0,
        },
        textBlocks:
          response.fullTextAnnotation?.pages?.[0]?.blocks?.length || 0,
      };

      console.log(`OCR successful: ${text?.substring(0, 100)}...`);

      return NextResponse.json({
        text: text || "",
        metadata,
        success: true,
      });
    } catch (visionError: any) {
      console.error("Google Vision API error:", {
        message: visionError.message,
        code: visionError.code,
        details: visionError.details,
        stack: visionError.stack,
      });

      // Handle specific Vision API errors
      if (visionError.code === 12) {
        return NextResponse.json(
          {
            error:
              "Vision API service unavailable. Please check your Google Cloud configuration.",
            details:
              process.env.NODE_ENV === "development"
                ? visionError.message
                : undefined,
            success: false,
          },
          { status: 503 }
        );
      }

      if (visionError.code === 16) {
        return NextResponse.json(
          {
            error:
              "Authentication failed. Please check your Google Cloud credentials.",
            success: false,
          },
          { status: 401 }
        );
      }

      throw visionError; // Re-throw to be caught by outer catch
    }
  } catch (err: any) {
    console.error("OCR API error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to process image",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
        success: false,
      },
      { status: 500 }
    );
  }
}
