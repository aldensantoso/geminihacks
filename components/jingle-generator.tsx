"use client";

import { useState, useRef } from "react";
import { Music, Loader2, Download, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface JingleResponse {
  success: boolean;
  jingle?: {
    audioBase64: string;
    lyrics: string;
    metadata: {
      productName: string;
      tone: string;
      duration: number;
    };
  };
  error?: string;
}

export function JingleGenerator() {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [tone, setTone] = useState("upbeat and catchy");
  const [duration, setDuration] = useState("30");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jingle, setJingle] = useState<JingleResponse["jingle"] | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }

    if (!productDescription.trim()) {
      setError("Product description is required");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/nano-banana/jingle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          productDescription: productDescription.trim(),
          tone,
          duration: parseInt(duration, 10),
        }),
      });

      const data: JingleResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to generate jingle");
        return;
      }

      if (data.jingle) {
        setJingle(data.jingle);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = () => {
    if (!jingle) return;

    const binaryString = atob(jingle.audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${jingle.metadata.productName.replace(/\s+/g, "_")}_jingle.mp3`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyLyrics = () => {
    if (!jingle) return;
    navigator.clipboard.writeText(jingle.lyrics);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-5 w-5" />
                Jingle Generator
              </CardTitle>
              <CardDescription>
                Create catchy promotional jingles for your products using AI
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid gap-3">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  Product Name
                </label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Nano Banana Pro"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  Product Description
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe what makes your product special..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                  disabled={isGenerating}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={isGenerating}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="upbeat and catchy">Upbeat & Catchy</option>
                    <option value="professional and smooth">Professional & Smooth</option>
                    <option value="playful and fun">Playful & Fun</option>
                    <option value="energetic and bold">Energetic & Bold</option>
                    <option value="calm and soothing">Calm & Soothing</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                    Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="15"
                    max="60"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Jingle...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Generate Jingle
                </>
              )}
            </Button>
          </form>

          {jingle && (
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Generated Jingle</h3>
                <div className="rounded-md bg-background p-3">
                  <audio
                    ref={audioRef}
                    controls
                    className="w-full"
                  >
                    <source
                      src={`data:audio/mpeg;base64,${jingle.audioBase64}`}
                      type="audio/mpeg"
                    />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Lyrics</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLyrics}
                    className="h-8"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md bg-background p-3 text-sm whitespace-pre-wrap">
                  {jingle.lyrics}
                </div>
              </div>

              <Button
                onClick={downloadAudio}
                variant="default"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download MP3
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
