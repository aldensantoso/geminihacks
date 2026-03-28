import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

function buildAudioPrompt(adText: string, productName: string, userNotes?: string) {
  const safeProduct = productName?.trim() || "the product";
  const cleanAd = adText?.trim() || "";
  const notes = userNotes?.trim();
  return [
    `Create an 8-second instrumental music bed for a product ad about ${safeProduct}.`,
    "Keep it clean, modern, and free of background sound effects or crowd noise.",
    "Avoid vocals; light hooks and rhythmic energy are okay but do not overpower voiceover.",
    "Target a ~8-second clip (tight, concise bed).",
    cleanAd && `Use this ad copy as creative guidance: ${cleanAd}`,
    notes && `Creator notes: ${notes}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
  }

  try {
    const { adText = "", productName = "Nano Banana product", notes = "" } = await request.json();

    if (!adText.trim()) {
      return NextResponse.json({ error: "adText is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildAudioPrompt(adText, productName, notes);

    const response = await ai.models.generateContent({
      model: "lyria-3-clip-preview",
      contents: prompt,
      config: {
        responseModalities: ["AUDIO", "TEXT"],
        durationSeconds: 8,
      },
    });

    const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((part: any) => part?.inlineData);
    const textPart = parts.find((part: any) => part?.text)?.text ?? "";

    const audioBase64: string | null = audioPart?.inlineData?.data ?? null;
    const mimeType: string = audioPart?.inlineData?.mimeType ?? "audio/mpeg";

    return NextResponse.json({
      prompt,
      notes,
      adText,
      audioBase64,
      mimeType,
      text: textPart,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate ad audio." }, { status: 500 });
  }
}
