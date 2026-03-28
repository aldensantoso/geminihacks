import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const MODEL_ID = "gemini-flash-latest";

function dataUrlToInlineData(url: string) {
  const [meta, data] = url.split(",");
  if (!meta || !data) return null;
  const match = meta.match(/data:(.*?);base64/);
  const mimeType = match?.[1] ?? "image/png";
  return { mimeType, data };
}

function buildPrompt(mode: "ad" | "seo", productName: string, notes?: string) {
  const safeName = productName?.trim() || "Nano Banana product";
  const base =
    mode === "ad"
      ? [
          `You are a performance marketer creating one high-conversion ad for ${safeName}.`,
          "Use the supplied product photos as visual context.",
          "Return a punchy headline and a 2-3 sentence body with a clear CTA.",
          "Keep tone confident, concise, and benefits-first.",
        ]
      : [
          `You are an SEO specialist creating keywords for ${safeName}.`,
          "Return 8-12 keywords with intent labels (Informational/Transactional/Commercial).",
          "Prefer long-tail phrases tied to the product visuals.",
        ];

  if (notes?.trim()) {
    base.push(`Creator notes: ${notes.trim()}`);
  }

  return base.join(" ");
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
  }

  try {
    const { mode = "ad", images = [], productName = "Nano Banana product", notes = "" } =
      await request.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "images array is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildPrompt(mode, productName, notes);

    const imageParts = images
      .map((url: string) => dataUrlToInlineData(url))
      .filter(Boolean)
      .map((inline) => ({ inlineData: inline }));

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      // Cast contents to the expected shape; inlineData parts are built above.
      contents: [
        {
          role: "user" as const,
          parts: [...imageParts, { text: prompt }] as any[],
        },
      ] as any,
    });

    const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.find((part: any) => part?.text)?.text ?? "";

    return NextResponse.json({ text, prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate copy.";
    return NextResponse.json({ error: `Failed to generate copy: ${message}` }, { status: 500 });
  }
}
