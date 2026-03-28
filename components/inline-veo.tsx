"use client";

import { useEffect, useState } from "react";

const PROMPT = `A montage of pizza making: a chef tossing and flattening the floury dough, ladling rich red tomato sauce in a spiral, sprinkling mozzarella cheese and pepperoni, and a final shot of the bubbling golden-brown pizza, upbeat electronic music with a rhythmical beat is playing, high energy professional video.`;

export function InlineVeoPlayer() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/nano-banana/ad-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: PROMPT }),
        });

        if (!res.ok) {
          let detail = "Video request failed";
          try {
            const body = await res.json();
            if (body?.error) detail = String(body.error);
          } catch (_) {
            // ignore
          }
          if (!cancelled) setError(detail);
          return;
        }

        const payload = await res.json();
        const url = payload?.videoUrl ?? null;
        if (!cancelled) {
          if (url) {
            setVideoUrl(url);
          } else {
            setError("No video URL returned");
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-white/80 p-3 text-sm text-muted-foreground">
        Generating inline Veo preview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!videoUrl) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-white/80 backdrop-blur">
      <div className="border-b border-border/60 px-4 py-2 text-sm font-semibold">Inline Veo Preview</div>
      <div className="p-3">
        <video className="w-full rounded-lg border border-border/60" src={videoUrl} controls autoPlay loop playsInline />
      </div>
    </div>
  );
}
