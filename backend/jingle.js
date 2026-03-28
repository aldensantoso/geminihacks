import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generates a promotional jingle or song for a product using Lyria AI
 * @param {string} productName - Name of the product to promote
 * @param {string} productDescription - Description of the product features
 * @param {string} tone - Desired tone (e.g., "upbeat", "professional", "playful", "energetic")
 * @param {number} duration - Desired duration in seconds (15-60 recommended)
 * @returns {Promise<{audio: Buffer, lyrics: string}>} Audio buffer and lyrics text
 */
export async function generateProductJingle(
  productName,
  productDescription,
  tone = "upbeat and catchy",
  duration = 30
) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const prompt = buildJinglePrompt(productName, productDescription, tone, duration);

  try {
    const response = await ai.models.generateContent({
      model: "lyria-3-clip-preview",
      contents: prompt,
      config: {
        responseModalities: ["AUDIO", "TEXT"],
      },
    });

    const result = {
      audio: null,
      lyrics: "",
    };

    // Extract audio and lyrics from response
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        result.lyrics = part.text;
      } else if (part.inlineData) {
        result.audio = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (!result.audio) {
      throw new Error("No audio data returned from Lyria");
    }

    return result;
  } catch (error) {
    console.error("Error generating jingle:", error);
    throw error;
  }
}

/**
 * Builds a detailed prompt for Lyria to generate a promotional jingle
 */
function buildJinglePrompt(productName, description, tone, duration) {
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

export default { generateProductJingle };
