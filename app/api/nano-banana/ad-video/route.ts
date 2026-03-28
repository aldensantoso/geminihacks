import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!GEMINI_API_KEY)
    return NextResponse.json({ error: "No API Key" }, { status: 500 });

  try {
    const { prompt, previousVideo } = await request.json();
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // 1. Start generation or extension
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt,
      video: previousVideo || undefined,
      config: {
        aspectRatio: previousVideo ? undefined : "9:16",
        resolution: "720p",
      },
    });

    // 2. Poll until finished
    while (!operation.done) {
      console.log("Rendering video...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    // Replace lines 33-35 with this:
if (operation.error) {
  throw new Error(`Google AI Generation Error: ${operation.error.message}`);
}

const responseData = operation.response; 

// Veo 3.1 uses 'generatedVideos' (plural) in the response object
const generatedVideo = responseData?.generatedVideos?.[0];

if (!generatedVideo) {
  console.log("Full Operation Object:", JSON.stringify(operation, null, 2)); // Debugging
  throw new Error("Model finished but no video data was found in the response.");
}

    if (!generatedVideo?.video?.uri) {
      throw new Error("Model finished but no video URI was found.");
    }

    const { uri, mimeType } = generatedVideo.video;

    // 3. Fetch the video directly — this gives us a real ReadableStream
    //    The SDK key is passed as a query param (Google Files API format)
    const videoResponse = await fetch(`${uri}&key=${GEMINI_API_KEY}`);

    if (!videoResponse.ok) {
      const errText = await videoResponse.text();
      throw new Error(`Video fetch failed (${videoResponse.status}): ${errText}`);
    }

    if (!videoResponse.body) {
      throw new Error("Video response had no readable body.");
    }

    // 4. Pipe the stream straight to the client — no buffering, no memory spike
    return new Response(videoResponse.body, {
      status: 200,
      headers: {
        "Content-Type": mimeType ?? "video/mp4",
        "Content-Disposition": 'attachment; filename="generated_video.mp4"',
        // Forward content-length if Google sends it, so browsers show progress
        ...(videoResponse.headers.get("content-length")
          ? { "Content-Length": videoResponse.headers.get("content-length")! }
          : {}),
      },
    });
  } catch (error: any) {
    console.error("Veo Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}