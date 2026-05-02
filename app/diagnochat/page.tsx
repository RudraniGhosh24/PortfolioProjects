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
  symptomCategories: Record<string, string[]>;
}

interface Message {
  role: "user" | "bot";
  text: string;
  diseases?: Array<{ name: string; probability: number; matched: string[]; matchedDirect: string[] }>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a.length < b.length) [a, b] = [b, a];
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], curr[j - 1], prev[j]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function fuzzyMatchTokens(inputWords: string[], targetWords: string[]): boolean {
  if (targetWords.length === 0) return false;
  for (let i = 0; i <= inputWords.length - targetWords.length; i++) {
    let ok = true;
    for (let j = 0; j < targetWords.length; j++) {
      const w1 = inputWords[i + j];
      const w2 = targetWords[j];
      if (w1 === w2) continue;
      if (w2.length <= 3) {
        ok = false;
        break;
      }
      const maxDist = w2.length <= 5 ? 1 : 2;
      if (levenshtein(w1, w2) > maxDist) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

const NEGATION_PATTERNS = [
  /\b(no|not|don't|dont|doesn't|doesnt|didn't|didnt|without|absence of|lack of)\s+([a-z\s]+)/gi,
  /\b(no|not|never)\s+([a-z\s]+)/gi,
];

function extractNegatedPhrases(text: string): string[] {
  const negated: string[] = [];
  for (const pattern of NEGATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      negated.push(match[2].trim().toLowerCase());
    }
  }
  return negated;
}

function isNegated(symptom: string, negatedPhrases: string[]): boolean {
  const symLower = symptom.toLowerCase();
  const symTokens = symLower.split(/\s+/);
  for (const phrase of negatedPhrases) {
    if (phrase.includes(symLower)) return true;
    // Check if any symptom word appears in the negated phrase
    for (const tok of symTokens) {
      if (tok.length > 3 && phrase.includes(tok)) return true;
    }
  }
  return false;
}

// Word-boundary safe inclusion check: prevents "ed" matching inside "and"
function textIncludesWord(text: string, word: string): boolean {
  if (word.length <= 2) return false; // Ignore very short terms
  if (word.length <= 4) {
    // For short terms, require word boundaries
    const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return pattern.test(text.toLowerCase());
  }
  // For longer terms, simple inclusion is safe enough
  return text.toLowerCase().includes(word.toLowerCase());
}

function partialMatch(inputTokens: string[], target: string): boolean {
  // Strict partial: input token must be at least 5 chars and at least 60% of target token length.
  // Skip exact token matches (e.g., "fever" should not partially match "high fever").
  const targetLower = target.toLowerCase();
  const targetTokens = targetLower.split(/\s+/).filter((t) => t.length > 2);
  for (const itok of inputTokens) {
    if (itok.length < 5) continue; // Too short for safe partial matching
    for (const ttok of targetTokens) {
      if (itok === ttok) continue; // Exact word match — not a partial
      // Input must be a substantial part of the target token (60%+)
      if (itok.length >= ttok.length * 0.6) {
        if (ttok.includes(itok) || itok.includes(ttok)) return true;
      }
    }
  }
  return false;
}

// Allow up to 1 gap word between symptom tokens (e.g., "gum is bleeding" → "bleeding gums")
function fuzzyMatchTokensWithGap(inputWords: string[], targetWords: string[]): boolean {
  if (targetWords.length === 0) return false;
  for (let i = 0; i <= inputWords.length - targetWords.length; i++) {
    let ok = true;
    let gaps = 0;
    let targetIdx = 0;
    for (let j = 0; j < targetWords.length && i + j + gaps < inputWords.length; j++) {
      const w1 = inputWords[i + j + gaps];
      const w2 = targetWords[targetIdx];
      if (w1 === w2) {
        targetIdx++;
        continue;
      }
      if (w2.length <= 3) {
        ok = false;
        break;
      }
      const maxDist = w2.length <= 5 ? 1 : 2;
      if (levenshtein(w1, w2) > maxDist) {
        // Try skipping one input word (gap tolerance)
        if (gaps < 1 && i + j + gaps + 1 < inputWords.length) {
          gaps++;
          const w1skip = inputWords[i + j + gaps];
          if (w1skip === w2) {
            targetIdx++;
            continue;
          }
          if (levenshtein(w1skip, w2) <= maxDist) {
            targetIdx++;
            continue;
          }
        }
        ok = false;
        break;
      }
      targetIdx++;
    }
    if (ok && targetIdx === targetWords.length) return true;
  }
  return false;
}

function extractSymptoms(text: string, data: SymptomData): { direct: Set<string>; expanded: Set<string> } {
  const direct = new Set<string>();
  const expanded = new Set<string>();
  const tokens = tokenize(text);
  const textLower = text.toLowerCase();
  const negatedPhrases = extractNegatedPhrases(text);

  // Helper to check if a symptom is negated
  const checkNegated = (sym: string) => isNegated(sym, negatedPhrases);

  // ── 1. Direct synonym matching ──
  for (const [canonical, syns] of Object.entries(data.synonyms)) {
    if (checkNegated(canonical)) continue;
    for (const syn of syns) {
      if (textIncludesWord(text, syn)) {
        direct.add(canonical);
        break;
      }
      const synTokens = syn.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
      if (fuzzyMatchTokens(tokens, synTokens)) {
        direct.add(canonical);
        break;
      }
      if (fuzzyMatchTokensWithGap(tokens, synTokens)) {
        direct.add(canonical);
        break;
      }
    }
  }

  // ── 2. Direct disease-symptom matching ──
  for (const disease of data.diseases) {
    for (const sym of disease.symptoms) {
      if (checkNegated(sym)) continue;
      if (textIncludesWord(text, sym)) {
        direct.add(sym);
        continue;
      }
      const symTokens = sym.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
      if (fuzzyMatchTokens(tokens, symTokens)) {
        direct.add(sym);
        continue;
      }
      if (fuzzyMatchTokensWithGap(tokens, symTokens)) {
        direct.add(sym);
        continue;
      }
      // Partial / substring matching (e.g., "digest" → "indigestion")
      if (partialMatch(tokens, sym)) {
        direct.add(sym);
      }
    }
  }

  // ── 3. Category matching ──
  // Only expand categories if the user explicitly mentions the category name
  // or a very close variant. NO cross-reference expansion from single tokens.
  for (const [category, symptoms] of Object.entries(data.symptomCategories || {})) {
    const catLower = category.toLowerCase();
    let matched = false;

    // Exact phrase match with word boundaries
    if (textIncludesWord(text, category)) {
      matched = true;
    } else {
      // Strong fuzzy match on full category name tokens
      const catTokens = catLower.split(/\s+/).filter((t) => t.length > 2);
      if (catTokens.length >= 2 && fuzzyMatchTokens(tokens, catTokens)) {
        matched = true;
      }
    }

    if (matched) {
      // Cap expanded symptoms per category to avoid overwhelming predictions
      let added = 0;
      const maxExpanded = 6;
      for (const sym of symptoms) {
        if (checkNegated(sym)) continue;
        if (!direct.has(sym)) {
          expanded.add(sym);
          added++;
          if (added >= maxExpanded) break;
        }
      }
    }
  }

  return { direct, expanded };
}

function predictDiseases(
  direct: Set<string>,
  expanded: Set<string>,
  data: SymptomData
): Array<{ name: string; probability: number; matched: string[]; matchedDirect: string[] }> {
  const results: Array<{ name: string; probability: number; matched: string[]; matchedDirect: string[] }> = [];
  const allSymptoms = new Set([...direct, ...expanded]);

  for (const disease of data.diseases) {
    const matchedDirect = disease.symptoms.filter((s) => direct.has(s));
    const matchedExpanded = disease.symptoms.filter((s) => expanded.has(s) && !direct.has(s));
    const matched = [...matchedDirect, ...matchedExpanded];

    if (matched.length === 0) continue;

    // Weight direct matches higher than expanded category matches
    const effectiveMatches = matchedDirect.length + matchedExpanded.length * 0.6;

    // Coverage: fraction of the disease's symptoms that are effectively present
    const coverage = effectiveMatches / disease.symptoms.length;
    // Precision: fraction of input symptoms that match this disease
    const precision = effectiveMatches / allSymptoms.size;
    // Combined score
    const score = coverage * precision;

    // Scale to a sensible percentage range
    const probability = Math.min(Math.round(score * 100) / 100, 0.95);

    results.push({
      name: disease.name,
      probability,
      matched,
      matchedDirect,
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
      const { direct, expanded } = extractSymptoms(userText, data);
      const predictions = predictDiseases(direct, expanded, data);

      let botText = "";
      if (predictions.length === 0) {
        botText = "I could not identify any matching symptoms from your description. Please try using more common terms like fever, cough, headache, digestive issues, etc.";
      } else {
        const allSymptoms = [...direct];
        if (expanded.size > 0) allSymptoms.push(`+${expanded.size} related`);
        botText = `Based on your symptoms (${allSymptoms.join(", ")}), here are the most likely conditions:`;
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
                              {d.matchedDirect.length < d.matched.length && (
                                <span className="text-[10px] text-amber-600 ml-1">
                                  ({d.matched.length - d.matchedDirect.length} inferred)
                                </span>
                              )}
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
