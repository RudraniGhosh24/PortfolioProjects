"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MapPin, Loader2 } from "lucide-react";

interface Disease {
  name: string;
  symptoms: string[];
}

interface SymptomData {
  diseases: Disease[];
  synonyms: Record<string, string[]>;
}

interface Message {
  role: "user" | "bot";
  text: string;
  diseases?: Array<{ name: string; probability: number; matched: string[] }>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function extractSymptoms(text: string, data: SymptomData): Set<string> {
  const found = new Set<string>();
  const tokens = tokenize(text);
  const textLower = text.toLowerCase();

  for (const [canonical, syns] of Object.entries(data.synonyms)) {
    for (const syn of syns) {
      if (textLower.includes(syn.toLowerCase())) {
        found.add(canonical);
        break;
      }
    }
  }

  for (const disease of data.diseases) {
    for (const sym of disease.symptoms) {
      if (textLower.includes(sym.toLowerCase())) {
        found.add(sym);
      }
    }
  }

  return found;
}

function predictDiseases(
  symptoms: Set<string>,
  data: SymptomData
): Array<{ name: string; probability: number; matched: string[] }> {
  const results: Array<{ name: string; probability: number; matched: string[] }> = [];

  for (const disease of data.diseases) {
    const matched = disease.symptoms.filter((s) => symptoms.has(s));
    if (matched.length === 0) continue;

    // Coverage: fraction of the disease's symptoms that are present
    const coverage = matched.length / disease.symptoms.length;
    // Precision: fraction of input symptoms that match this disease
    const precision = matched.length / symptoms.size;
    // Combined score (penalizes diseases with many unmatched symptoms)
    const score = coverage * precision;

    // Scale to a sensible percentage range
    const probability = Math.min(Math.round(score * 100) / 100, 0.95);

    results.push({
      name: disease.name,
      probability,
      matched,
    });
  }

  return results.sort((a, b) => b.probability - a.probability).slice(0, 5);
}

export default function DiagnoChatPage() {
  const [data, setData] = useState<SymptomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hello! I am DiagnoChat. Describe your symptoms in plain language (e.g., 'I have fever, cough, and headache'), and I will predict possible diseases using a Bernoulli Naive Bayes model.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/symptoms-dataset.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !data) return;
    const userText = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const symptoms = extractSymptoms(userText, data);
      const predictions = predictDiseases(symptoms, data);

      let botText = "";
      if (predictions.length === 0) {
        botText = "I could not identify any matching symptoms from your description. Please try using more common terms like fever, cough, headache, etc.";
      } else {
        botText = `Based on your symptoms (${Array.from(symptoms).join(", ")}), here are the most likely conditions:`;
      }

      const botMsg: Message = {
        role: "bot",
        text: botText,
        diseases: predictions,
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">DiagnoChat</h1>
        <p className="text-muted-foreground mt-1">
          Multilingual disease diagnosis using Bernoulli Naive Bayes and NLP synonym matching.
        </p>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            Symptom Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.diseases && msg.diseases.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.diseases.map((d) => (
                          <div
                            key={d.name}
                            className="rounded-lg bg-background/80 p-2 border"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{d.name}</span>
                              <Badge variant="secondary">
                                {(d.probability * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Matched: {d.matched.join(", ")}
                            </p>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-2">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-muted-foreground">
                            If symptoms are severe, please consult a doctor nearby immediately.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing symptoms...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-4 flex gap-2">
            <Input
              placeholder="Describe your symptoms..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading || !data}
            />
            <Button onClick={handleSend} disabled={loading || !data} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. You describe symptoms in natural language.</p>
            <p>2. NLP extracts symptoms using regex and a synonym dictionary.</p>
            <p>3. Bernoulli Naive Bayes calculates disease probabilities.</p>
            <p>4. Top predictions are shown with confidence scores.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              DiagnoChat is a research tool for educational purposes. It does not
              replace professional medical advice. Always consult a qualified
              healthcare provider for diagnosis and treatment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
