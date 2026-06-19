import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copilotChat } from "@/lib/ai.functions";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/copiloto")({ component: CopilotoPage });

type Msg = { role: "user" | "assistant"; content: string };

const sugestoes = [
  "Como devo abordar o João amanhã?",
  "Quem precisa de feedback hoje?",
  "Quem devo reconhecer esta semana?",
  "Qual o maior gargalo comercial?",
  "Qual vendedor precisa de ajuda urgente?",
];

function CopilotoPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou seu copiloto de liderança. Pergunte sobre a equipe, gargalos, prioridades ou recomendações." },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const m = useMutation({
    mutationFn: (msgs: Msg[]) => copilotChat({ data: { messages: msgs } }),
    onSuccess: (r) => setMessages((prev) => [...prev, { role: "assistant", content: r.content }]),
    onError: (e: any) => toast.error(e.message),
  });

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    m.mutate(next);
  }

  return (
    <>
      <Topbar title="IA de Liderança" subtitle="Copiloto para decisões comerciais" />
      <main className="flex flex-col p-4 md:p-6" style={{ height: "calc(100vh - 4rem)" }}>
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-primary text-primary-foreground shadow-glow"}`}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {m.isPending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary"><Bot className="h-4 w-4 text-primary-foreground" /></div>
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Pensando...</div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length <= 1 && (
              <div className="border-t border-border/60 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" />Perguntas sugeridas</div>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs transition hover:bg-accent/10 hover:border-accent/40">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-border/60 p-3">
              <Input placeholder="Pergunte ao copiloto..." value={input} onChange={(e) => setInput(e.target.value)} disabled={m.isPending} />
              <Button type="submit" disabled={m.isPending || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
