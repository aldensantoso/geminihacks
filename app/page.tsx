
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { InlineVeoPlayer } from "@/components/inline-veo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";
import { ArrowRight, Grid, PlugZap, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <nav className="w-full flex justify-center h-16">
          <div className="w-full max-w-7xl flex justify-between items-center px-5 py-3 text-sm">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Helio Studio
              </Link>
              <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                <Link href="/protected" className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium hover:border-primary/40">
                  Workspace
                </Link>
                <Link href="/protected/products" className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium hover:border-primary/40">
                  Prompts
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </nav>

        <div className="w-full max-w-7xl px-5 flex flex-col gap-10">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-amber-100 via-background to-sky-50 p-[1px] shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,214,165,0.5),transparent_36%),radial-gradient(circle_at_82%_8%,rgba(187,232,255,0.45),transparent_34%)]" aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1.1fr,0.9fr] rounded-[22px] bg-background/85 p-8 md:p-10 backdrop-blur-xl">
              <div className="space-y-6">
                <Badge className="rounded-full bg-primary/10 text-primary">AI product canvas</Badge>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                    Build product stories with chat, assets, and multi-mode prompts.
                  </h1>
                  <p className="text-muted-foreground max-w-xl">
                    A luminous workspace where ads, photoshoot briefs, and SEO keywording live together. Auth, theming, and drag-drop attachments are already wired.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="rounded-xl gap-2">
                    <Link href="/protected">
                      Enter workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="rounded-xl gap-2 border-border/70">
                    <Link href="/protected/products">View saved prompts</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {["Drag & drop images", "Multi-select modes", "Prerender-safe"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/60 bg-background/70 px-3 py-1 font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative grid gap-3">
                <Suspense fallback={null}>
                  <InlineVeoPlayer />
                </Suspense>
                {[{
                  title: "Creation rails",
                  desc: "Ad copy, photoshoot direction, and SEO keywording run in parallel.",
                  icon: <Wand2 className="h-4 w-4" />,
                }, {
                  title: "Library view",
                  desc: "Your prompts page keeps the best briefs reusable.",
                  icon: <Grid className="h-4 w-4" />,
                }, {
                  title: "Supabase auth",
                  desc: "Protected routes are wired and theme-aware.",
                  icon: <PlugZap className="h-4 w-4" />,
                }].map(({ title, desc, icon }) => (
                  <Card key={title} className="relative border-border/60 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="rounded-full border border-border/60 bg-background/80 p-1 text-primary">{icon}</span>
                        {title}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[{
              title: "Ad mode",
              copy: "Angles, CTAs, and audience hooks—echoed back in one tap.",
              tone: "from-indigo-500/20 via-background to-background",
            }, {
              title: "Photoshoot mode",
              copy: "Shot lists, lighting notes, and framing prompts with image drops.",
              tone: "from-emerald-500/20 via-background to-background",
            }, {
              title: "SEO mode",
              copy: "Long-tail keywords and meta pairs ready for PDPs.",
              tone: "from-amber-500/20 via-background to-background",
            }].map((item) => (
              <Card key={item.title} className={`border-border/60 bg-gradient-to-br ${item.tone}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">{item.copy}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Multi-select friendly
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">How to launch</CardTitle>
              <CardDescription className="text-muted-foreground">Three moves to go live.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                <span className="text-xs font-semibold text-foreground">01</span>
                <p>Connect Supabase in env vars and sign in.</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                <span className="text-xs font-semibold text-foreground">02</span>
                <p>Hit the protected canvas; drop assets and pick modes.</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                <span className="text-xs font-semibold text-foreground">03</span>
                <p>Save prompts in the library page to reuse later.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="w-full flex itemscenter justify-center border-t mx-auto text-center text-xs gap-6 py-12">
          <p className="text-muted-foreground">Helio Studio · Built on Next + Supabase</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
