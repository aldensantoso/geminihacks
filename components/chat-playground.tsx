"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Paperclip, Send, Sparkles, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images: string[];
  timestamp: number;
};

type Attachment = {
  id: string;
  name: string;
  preview: string;
  file: File;
};

type Stage = "photo" | "ad" | "seo" | "saved";

type FavoriteImage = {
  id: string;
  url: string;
  sourceMessageId: string;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() ?? "";
      const base64 = result.includes(",") ? result.split(",").pop() ?? "" : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });

export function ChatPlayground() {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [stage, setStage] = useState<Stage>("photo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteImage[]>([]);
  const [adCopy, setAdCopy] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [adVideo, setAdVideo] = useState<{ uri: string | null; file: string | null; status: string | null } | null>(null);
  const [adAudio, setAdAudio] = useState<{ url: string; mimeType: string; text?: string } | null>(null);
  const [savedSet, setSavedSet] = useState<{ images: FavoriteImage[]; ad: string; seo: string } | null>(null);
  const idRef = useRef(1);
  const baseTimestampRef = useRef(0);
  const tsCounterRef = useRef(0);
  const lastImageRef = useRef<{ data: string; mimeType: string } | null>(null);
  const lastPromptRef = useRef<string>("");
  const styleCounterRef = useRef(0);
  const photoGenCountRef = useRef(0);
  const nextId = useCallback(() => {
    idRef.current += 1;
    return `msg-${idRef.current}`;
  }, []);
  const nextTimestamp = useCallback(() => {
    tsCounterRef.current += 1;
    return baseTimestampRef.current + tsCounterRef.current * 1000;
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "msg-1",
    role: "assistant",
      text: "Flow: generate product photos (max 5), pick up to 5 favorites, then I'll craft the ad, then SEO keywords.",
    images: [],
    timestamp: 0,
  }]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<Attachment[]>([]);
  const adVideoUriRef = useRef<string | null>(null);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  useEffect(() => {
    baseTimestampRef.current = Date.now();
    setMessages((prev) =>
      prev.map((msg) =>
        msg.timestamp === 0 ? { ...msg, timestamp: baseTimestampRef.current } : msg,
      ),
    );
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  useEffect(() => {
    const previousUri = adVideoUriRef.current;
    if (previousUri && previousUri !== adVideo?.uri) {
      URL.revokeObjectURL(previousUri);
    }

    adVideoUriRef.current = adVideo?.uri ?? null;

    return () => {
      if (adVideoUriRef.current) {
        URL.revokeObjectURL(adVideoUriRef.current);
      }
    };
  }, [adVideo?.uri]);

  const generateAd = useCallback(
    async (notes?: string) => {
      if (favorites.length === 0) return;
      if (adVideo?.status === "pending") return;
      try {
        setIsGeneratingAd(true);
        setAdVideo(null);
        const response = await fetch("/api/nano-banana/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "ad",
            images: favorites.map((f) => f.url),
            productName: lastPromptRef.current || "Product",
            notes: notes ?? lastPromptRef.current,
          }),
        });

        if (!response.ok) {
          let detail = "Ad generation failed";
          try {
            const errBody = await response.json();
            if (errBody?.error) detail = errBody.error;
          } catch (_) {
            // ignore parse errors
          }
          setAdCopy(detail); // stop auto-retry loop and surface state
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: detail,
              images: [],
              timestamp: nextTimestamp(),
            },
          ]);
          return;
        }

        const payload = await response.json();
        setAdCopy(payload.text ?? "");
        setAdAudio(null);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: `Ad draft: ${payload.text ?? ""}`,
            images: [],
            timestamp: nextTimestamp(),
          },
        ]);

        // Trigger video ad generation via VEO using the ad draft as the master prompt
        try {
          const masterPrompt = payload.text
            ? `High-energy 9:16 product ad, upbeat electronic bed. Use this script: ${payload.text}`
            : "High-energy 9:16 product ad, upbeat electronic bed.";

          const videoResponse = await fetch("/api/nano-banana/ad-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: masterPrompt }),
          });

          if (videoResponse.ok) {
            const videoBlob = await videoResponse.blob();
            const url = URL.createObjectURL(videoBlob);
            setAdVideo({ uri: url, file: null, status: "ready" });

            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: "Ad video ready to preview.",
                images: [],
                timestamp: nextTimestamp(),
              },
            ]);
          } else {
            let videoDetail = "Could not generate ad video right now.";
            try {
              const errBody = await videoResponse.json();
              if (errBody?.error) videoDetail = String(errBody.error);
            } catch (_) {
              // ignore
            }
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: videoDetail,
                images: [],
                timestamp: nextTimestamp(),
              },
            ]);
          }
        } catch (videoError) {
          const message = videoError instanceof Error ? videoError.message : "Ad video request failed.";
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: `Ad video request failed: ${message}`,
              images: [],
              timestamp: nextTimestamp(),
            },
          ]);
        }

        // Temporarily disable audio bed (Lyria) to return video immediately.
        return;
      } finally {
        setIsGeneratingAd(false);
      }
    },
    [adVideo, favorites, nextId, nextTimestamp],
  );

  const generateSeo = useCallback(
    async (notes?: string) => {
      if (favorites.length === 0) return;
      try {
        setIsGeneratingSeo(true);
        const response = await fetch("/api/nano-banana/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "seo",
            images: favorites.map((f) => f.url),
            productName: lastPromptRef.current || "Product",
            notes: notes ?? lastPromptRef.current,
          }),
        });

        if (!response.ok) throw new Error("SEO generation failed");

        const payload = await response.json();
        setSeoKeywords(payload.text ?? "");
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: `SEO ideas: ${payload.text ?? ""}`,
            images: [],
            timestamp: nextTimestamp(),
          },
        ]);
      } finally {
        setIsGeneratingSeo(false);
      }
    },
    [favorites, nextId, nextTimestamp],
  );

  useEffect(() => {
    if (stage === "seo" && favorites.length > 0 && adCopy && !seoKeywords && !isGeneratingSeo) {
      generateSeo();
    }
  }, [adCopy, favorites.length, generateAd, generateSeo, isGeneratingAd, isGeneratingSeo, seoKeywords, stage]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const next = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => ({
          id: nextId(),
          name: file.name,
          preview: URL.createObjectURL(file),
          file,
        }));

      if (!next.length) return;
      setAttachments((prev) => [...prev, ...next]);
    },
    [nextId],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleSend = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      const trimmed = input.trim();
        if (stage === "photo" && !trimmed && attachments.length === 0) return;
        if (stage === "ad" && favorites.length === 0) return;
        if (stage === "seo" && favorites.length === 0) return;

        lastPromptRef.current = trimmed;

        const modeLabel = stage.toUpperCase();

        if (stage !== "photo") {
          setInput("");
        }

        const images = attachments.map((item) => item.preview);
        const shouldGeneratePhotos =
          stage === "photo" && (attachments.length > 0 || lastImageRef.current);

      const userMessage: ChatMessage = {
        id: nextId(),
        role: "user",
        text: trimmed,
        images,
        timestamp: nextTimestamp(),
      };

      setMessages((prev) => [...prev, userMessage]);
        setInput(stage === "photo" ? "" : input);
        setAttachments((prev) => {
          prev.forEach((item) => URL.revokeObjectURL(item.preview));
          return [];
        });

      if (shouldGeneratePhotos) {
          if (photoGenCountRef.current >= 3) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: "Photo limit reached (3). Select favorites or finalize.",
                images: [],
                timestamp: nextTimestamp(),
              },
            ]);
            return;
          }
        const pendingId = nextId();
        const pendingTimestamp = nextTimestamp();

        setMessages((prev) => [
          ...prev,
          {
            id: pendingId,
            role: "assistant",
                text: "Generating a new pro photo with Nano Banana studio...",
            images: [],
            timestamp: pendingTimestamp,
          },
        ]);

        try {
          setIsGenerating(true);
            const base64 = attachments.length > 0
              ? await fileToBase64(attachments[0].file)
              : lastImageRef.current?.data;
            const mimeType = attachments.length > 0
              ? attachments[0].file.type
              : lastImageRef.current?.mimeType;

            if (!base64 || !mimeType) {
              throw new Error("No image available for generation");
            }

            if (attachments.length > 0) {
              lastImageRef.current = { data: base64, mimeType };
            }
            const response = await fetch("/api/nano-banana", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: trimmed || "Product",
                imageBase64: base64,
                imageMimeType: mimeType,
              notes: trimmed,
                styleIndex: styleCounterRef.current++,
            }),
          });

          if (!response.ok) {
            throw new Error("Photo generation failed");
          }

            const payload = await response.json();
            const generatedImages: string[] = payload.images ?? (payload.image ? [payload.image] : []);
          const contextText: string = payload.contextPrompts?.[0] ?? payload.contextPrompt ?? "Photoshoot set ready.";
            photoGenCountRef.current += 1;

          setMessages((prev) =>
            prev.map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    text: `(${modeLabel}) ${contextText}`,
                      images: generatedImages,
                  }
                : message,
            ),
          );

          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: "Want me to tweak lighting, angle, or backdrop?",
              images: [],
              timestamp: nextTimestamp(),
            },
          ]);
        } catch (error) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    text: "Could not generate photos. Please try again.",
                  }
                : message,
            ),
          );
        } finally {
          setIsGenerating(false);
        }
      } else {
          if (stage === "ad") {
            await generateAd(trimmed);
          } else if (stage === "seo") {
            await generateSeo(trimmed);
          }
      }
    },
    [attachments, favorites.length, generateAd, generateSeo, input, nextId, nextTimestamp, stage],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const hasContent =
    stage === "photo"
      ? input.trim().length > 0 || attachments.length > 0 || !!lastImageRef.current
      : stage === "ad" || stage === "seo"
        ? favorites.length > 0
        : false;

  const toggleFavorite = (url: string, sourceMessageId: string) => {
    setFavorites((prev) => {
      const exists = prev.find((item) => item.url === url);
      if (exists) return prev.filter((item) => item.url !== url);
      if (prev.length >= 5) return prev; // limit to 5
      return [...prev, { id: nextId(), url, sourceMessageId }];
    });
  };

  const handleSave = () => {
    setSavedSet({ images: favorites, ad: adCopy, seo: seoKeywords });
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: "Saved your set (5 picks max), ad, and SEO notes.",
        images: favorites.map((f) => f.url),
        timestamp: nextTimestamp(),
      },
    ]);
  };

  const placeholderByStage: Record<Stage, string> = {
    photo: "Describe the photoshoot scene and drop product shots (limit 3 generations)",
    ad: "Add a short tweak for the ad (optional)",
    seo: "Add context for SEO keywords (optional)",
    saved: "All done",
  };

  const activePlaceholder = placeholderByStage[stage];

  const visibleMessages = messages.slice(-3);
  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-to-b from-background/70 via-background/60 to-muted/50 shadow-2xl ring-1 ring-foreground/5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(147,197,253,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(192,132,252,0.22),transparent_32%),radial-gradient(circle_at_10%_90%,rgba(110,231,183,0.18),transparent_25%)]" />
      <CardHeader className="relative flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold">Creative board</CardTitle>
          <p className="text-sm text-muted-foreground">
            Step 1: Photoshoot (post your product) → Step 2: Generate your ad (2 attempts) → Step 3: SEO → Finalize.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
          <Sparkles className="h-4 w-4 text-primary" />
          Live mock
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              {["photo", "ad", "seo"].map((step, index) => {
                const labels = {
                  photo: { title: "Photoshoot", helper: "Post your product" },
                  ad: { title: "Ad", helper: "Generate your ad (2 attempts)" },
                  seo: { title: "SEO", helper: "Keywords + finalize" },
                } as const;
                const config = labels[step as keyof typeof labels];
                return (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                      stage === step
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 bg-background text-muted-foreground",
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-[11px] font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold">{config.title}</span>
                      <span className="text-[11px]">{config.helper}</span>
                    </div>
                  </div>
                );
              })}
              <div className="ml-auto text-[11px] text-muted-foreground text-right">
                <div>Photo gens: {photoGenCountRef.current}/3</div>
                <div>Favorites saved for ad/SEO: {favorites.length}/5</div>
              </div>
            </div>
          <div
            className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-background/60 backdrop-blur-xl"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="relative flex h-[520px] flex-col">
              <div
                ref={scrollerRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 pt-4 pb-2"
              >
                {hiddenCount > 0 && (
                  <div className="mb-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
                    Showing last 3 responses · {hiddenCount} earlier hidden
                  </div>
                )}
                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full flex-col gap-2",
                      message.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium capitalize">{message.role}</span>
                      <span>·</span>
                      <span>{timeFormatter.format(new Date(message.timestamp))}</span>
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur",
                        message.role === "user"
                          ? "border-primary/30 bg-primary/10 text-primary-foreground"
                          : "border-border/70 bg-card/70",
                      )}
                    >
                      {message.text && message.images.length === 0 && (
                        <p className="leading-relaxed">{message.text}</p>
                      )}
                      {message.images.length > 0 && (
                        <div className="mt-3 grid max-w-[520px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {message.images.map((url, index) => {
                            const isFavorite = favorites.some((fav) => fav.url === url);
                            return (
                              <button
                                key={`${message.id}-img-${index}`}
                                type="button"
                                onClick={() => toggleFavorite(url, message.id)}
                                className={cn(
                                  "group relative h-32 overflow-hidden rounded-lg border bg-background/80 transition",
                                  isFavorite ? "border-primary ring-2 ring-primary/50" : "border-border/70",
                                )}
                              >
                                <img
                                  src={url}
                                  alt="Attachment"
                                  className="h-full w-full object-cover"
                                />
                                <span
                                  className={cn(
                                    "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-[11px] font-semibold uppercase tracking-wide text-white opacity-0 transition",
                                    isFavorite && "opacity-100",
                                    "group-hover:opacity-100",
                                  )}
                                >
                                  {isFavorite ? "Pinned for ad/SEO" : "Click to pin"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {favorites.length > 0 && (
                <div className="mx-4 mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Saved for ad + SEO
                      </span>
                      <span className="font-semibold text-primary">{favorites.length}/5 selected</span>
                      <span className="text-muted-foreground">Click photos to pin them. They feed Step 2 and 3 automatically.</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {stage === "photo" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={favorites.length === 0}
                          onClick={() => setStage("ad")}
                        >
                          Proceed to ad
                        </Button>
                      )}
                      {stage === "ad" && adCopy && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setStage("seo")}
                        >
                          Proceed to SEO
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map((fav) => (
                      <div
                        key={fav.id}
                        className="group relative h-16 w-16 overflow-hidden rounded-lg border border-primary/50"
                      >
                        <img src={fav.url} alt="Favorite" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => toggleFavorite(fav.url, fav.sourceMessageId)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-background/70 px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 font-medium text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    {attachments.length} image{attachments.length > 1 ? "s" : ""} ready
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="group relative flex items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 pr-1 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 overflow-hidden rounded-full border border-border/70">
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="max-w-32 truncate text-foreground/80">
                            {attachment.name}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex flex-col gap-3 border-t border-border/70 bg-background/80 px-4 py-3 backdrop-blur"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => stage === "photo" && fileInputRef.current?.click()}
                    disabled={stage !== "photo"}
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="sr-only">Attach image</span>
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3">
                      <Input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={activePlaceholder}
                        className="h-11 border-none bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!hasContent || isGenerating}
                    className="h-11 gap-2 rounded-xl px-5"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {stage === "photo" && (
                    <>
                      <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 font-medium">
                        Drag & drop product images anywhere
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                        Click photos to select up to 5 favorites
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                        Generations left: {Math.max(0, 5 - photoGenCountRef.current)}
                      </span>
                    </>
                  )}
                  {stage === "ad" && (
                    <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">Ad will be generated from favorites automatically; add tweaks above.</span>
                  )}
                  {stage === "seo" && (
                    <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">SEO will generate from favorites + ad context.</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {stage === "ad" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={favorites.length === 0 || isGeneratingAd || adVideo?.status === "pending"}
                      onClick={() => generateAd(input.trim() || undefined)}
                    >
                      {isGeneratingAd
                        ? "Generating ad…"
                        : adVideo?.status === "pending"
                          ? "Ad video pending"
                          : "Regenerate ad"}
                    </Button>
                  )}
                  {stage === "seo" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={favorites.length === 0 || isGeneratingSeo}
                      onClick={() => generateSeo(input.trim() || undefined)}
                    >
                      {isGeneratingSeo ? "Generating SEO…" : "Regenerate SEO"}
                    </Button>
                  )}
                  {stage === "seo" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={favorites.length === 0 || (!adCopy && !seoKeywords)}
                      onClick={() => {
                        handleSave();
                        setStage("saved");
                      }}
                    >
                      Save set
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </CardContent>

      {(adCopy || seoKeywords || savedSet) && (
        <div className="border-t border-border/60 bg-background/70 px-6 py-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            {adCopy && (
              <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ad draft</p>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{adCopy}</p>
              </div>
            )}
            {seoKeywords && (
              <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">SEO keywords</p>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{seoKeywords}</p>
              </div>
            )}
            {adAudio && (
              <div className="rounded-xl border border-border/60 bg-card/70 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Ad music (clean bed)</span>
                  <span className="text-[11px] text-muted-foreground">15s</span>
                </div>
                <audio className="mt-2 w-full" controls src={adAudio.url} />
                {adAudio.text && (
                  <p className="mt-2 text-xs text-muted-foreground">{adAudio.text}</p>
                )}
              </div>
            )}
            {adVideo && (
              <div className="rounded-xl border border-border/60 bg-card/70 p-3 md:col-span-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Ad video</span>
                  <span className="text-[11px] font-semibold text-primary">{adVideo.status ?? "pending"}</span>
                </div>
                {adVideo.status === "ready" && adVideo.uri ? (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <div className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-primary/20 bg-black shadow-xl">
                      <video
                        src={adVideo.uri}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <a
                      href={adVideo.uri}
                      download="ad-video.mp4"
                      className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                    >
                      Download MP4
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Video is processing{adVideo.file ? ` (file: ${adVideo.file})` : "."}
                  </p>
                )}
              </div>
            )}
            {savedSet && (
              <div className="rounded-xl border border-primary/50 bg-primary/5 p-3 md:col-span-2">
                <div className="flex items-center justify-between text-xs text-primary">
                  <span className="font-semibold">Saved set</span>
                  <span>{savedSet.images.length} shots</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {savedSet.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt="Saved"
                      className="h-14 w-14 rounded-lg border border-primary/50 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default ChatPlayground;
