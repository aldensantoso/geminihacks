import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

function buildJinglePrompt(
  productName: string,
  description: string,
  tone: string,
  duration: number
): string {
  return `Create a ${duration}-second promotional jingle or song for the product "${productName}".

Product Details:
- Name: ${productName}
- Description: ${description}
- Tone: ${tone}

Requirements:
- The jingle should be ${duration} seconds long
- Include the product name multiple times (at least 2-3 times)
- Make it memorable and catchy
- Use uplifting, positive musical elements
- Include clear, singable lyrics that highlight the product's benefits
- The music should be suitable for commercial/promotional use
- Use a variety of instruments that complement the ${tone} tone
- The jingle should start strong and end with a memorable hook

Please generate both the audio and provide the complete lyrics in your response.`;
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const {
      productName = "Amazing Product",
      productDescription = "A revolutionary product that changes everything",
      tone = "upbeat and catchy",
      duration = 30,
    } = await request.json();

    if (!productName || !productDescription) {
      return NextResponse.json(
        { error: "productName and productDescription are required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildJinglePrompt(productName, productDescription, tone, duration);

    const response = await ai.models.generateContent({
      model: "lyria-3-clip-preview",
      contents: prompt,
      config: {
        responseModalities: ["AUDIO", "TEXT"],
      },
    });

    let audioBase64: string | null = null;
    let lyrics = "";

    // Extract audio and lyrics from response
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];
      const parts = candidate?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            lyrics = part.text;
          } else if (part.inlineData?.data) {
            audioBase64 = part.inlineData.data;
          }
        }
      }
    }

    if (!audioBase64) {
      return NextResponse.json(
        { error: "Failed to generate audio for jingle" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jingle: {
        audioBase64,
        lyrics,
        metadata: {
          productName,
          productDescription,
          tone,
          duration,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Jingle generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate jingle",
      },
      { status: 500 }
    );
  }
}
