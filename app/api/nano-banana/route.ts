import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const VARIATION_STYLES = [
  "Studio hero on seamless light gray with soft wrap lighting and a crisp shadow.",
  "Lifestyle on warm wood with diffused window light and a blurred loft backdrop.",
  "Editorial on a bold color gradient with clean rim light and high contrast.",
  "Top-down on textured stone with minimal propping and controlled shadows.",
  "Moody close-up with dark backdrop, edge lighting, and glossy highlights.",
];

const MAX_VARIATIONS = 3;

function buildContextPrompt(productName: string, notes?: string) {
  const safeName = productName?.trim() || "Nano Banana product";

  return [
    `You are a professional ecommerce product photographer shooting ${safeName}.`,
    "Generate five distinct photos: one photo per scene, no grids or collages.",
    "Do NOT combine multiple angles into one image or create multi-panel layouts.",
    "Each photo must contain only one composition and one camera angle.",
    "The product must appear exactly once unless naturally reflected (e.g., subtle reflection).",
    "Keep the product shape, materials, colors, and logos identical to the reference image.",
    "Do not add text, labels, watermarks, or extra design elements.",
    "Use realistic photography (not illustration, CGI, or drawing).",
    "Maintain consistent product identity across all generations.",
    notes?.trim() ? `Creator notes: ${notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
  }

  try {
    const {
      imageBase64,
      imageMimeType = "image/png",
      productName = "Nano Banana product",
      notes = "",
      styleIndex = 0,
    } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildContextPrompt(productName, notes);
    const cleanBase64 = typeof imageBase64 === "string" && imageBase64.includes(",")
      ? imageBase64.split(",").pop() ?? ""
      : imageBase64;

    const images: string[] = [];
    const contexts: string[] = [];

    for (let i = 0; i < MAX_VARIATIONS; i += 1) {
      const style = VARIATION_STYLES[Math.abs(styleIndex + i) % VARIATION_STYLES.length];
      const scenePrompt = `${prompt} Scene: ${style}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: cleanBase64, mimeType: imageMimeType } },
              { text: scenePrompt },
            ],
          },
        ],
      });

      const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
      const inlinePart = parts.find((part: any) => part?.inlineData?.data);
      const image = inlinePart?.inlineData?.data
        ? `data:${imageMimeType};base64,${inlinePart.inlineData.data}`
        : null;
      if (image) {
        images.push(image);
        contexts.push(scenePrompt);
      }
    }

    return NextResponse.json({ images, contextPrompts: contexts });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate photos." }, { status: 500 });
  }
}
