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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBytes = buffer.toString("base64");

    const [response] = await visionClient.textDetection({
      image: { content: imageBytes },
    });

    const detections = response.textAnnotations;
    const text =
      detections && detections.length > 0
        ? detections[0].description
        : "No text found in image";

    // Additional metadata
    const metadata = {
      confidence: response.fullTextAnnotation?.pages?.[0]?.confidence || 0,
      detectedLanguages:
        response.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages ||
        [],
      imageSize: {
        width: response.fullTextAnnotation?.pages?.[0]?.width || 0,
        height: response.fullTextAnnotation?.pages?.[0]?.height || 0,
      },
    };

    return NextResponse.json({
      text: text || "",
      metadata,
      success: true,
    });
  } catch (err) {
    console.error("OCR API error:", err);
    return NextResponse.json(
      { error: "Failed to process image", success: false },
      { status: 500 }
    );
  }
}
