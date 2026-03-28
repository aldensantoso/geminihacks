import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { InfoIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatPlayground } from "@/components/chat-playground";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-10">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-6 py-5 shadow-lg">
        <div className="absolute inset-0 opacity-60" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(110,231,183,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(192,132,252,0.25),transparent_32%)]" />
        </div>
        <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 text-sm text-foreground">
            <div className="mt-1 rounded-full bg-primary/15 p-2 text-primary">
              <InfoIcon size="16" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Protected workspace</p>
              <p className="text-muted-foreground">
                Authenticated users can experiment with a ready-to-ship chat canvas, image attachments, and live UI polish.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/protected/products">
              <Button variant="ghost" className="gap-2 rounded-xl border border-border/60" size="sm">
                Your product prompts
              </Button>
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-primary" />
              You are in
            </div>
          </div>
        </div>
      </div>

      <ChatPlayground />
    </div>
  );
}