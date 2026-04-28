"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileSearch, ScrollText, Users, Building2, Calendar, Landmark, Banknote } from "lucide-react";

interface PatternDef {
  name: string;
  patterns?: string[];
  regex?: string;
  flags?: string;
}

interface PatternData {
  entities: PatternDef[];
  stopwords: string[];
}

interface ExtractedEntity {
  type: string;
  value: string;
  icon: React.ReactNode;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  act_name: <ScrollText className="h-4 w-4" />,
  section_reference: <FileSearch className="h-4 w-4" />,
  case_number: <FileSearch className="h-4 w-4" />,
  court_name: <Landmark className="h-4 w-4" />,
  party_name: <Users className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  judge_name: <Users className="h-4 w-4" />,
  money_amount: <Banknote className="h-4 w-4" />,
};

function extractEntities(text: string, patterns: PatternDef[]): ExtractedEntity[] {
  const results: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const def of patterns) {
    if (def.patterns) {
      for (const pat of def.patterns) {
        const regex = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const key = `${def.name}:${match[0]}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ type: def.name, value: match[0], icon: ENTITY_ICONS[def.name] });
          }
        }
      }
    }
    if (def.regex) {
      const regex = new RegExp(def.regex, def.flags || "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const val = match[1] || match[0];
        const key = `${def.name}:${val}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ type: def.name, value: val, icon: ENTITY_ICONS[def.name] });
        }
      }
    }
  }

  return results;
}

function summarize(text: string, stopwords: string[]): string {
  const sentences = text
    .replace(/([.?!])\s+(?=[A-Z])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length <= 3) return text;

  const wordFreq: Record<string, number> = {};
  const stopSet = new Set(stopwords);

  for (const s of sentences) {
    const words = s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopSet.has(w));
    for (const w of words) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const scored = sentences.map((s) => {
    const words = s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const score = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / (words.length || 1);
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(3, Math.floor(sentences.length * 0.25)));
  const topSet = new Set(top.map((t) => t.sentence));

  return sentences.filter((s) => topSet.has(s)).join(". ") + ".";
}

export default function LegalSummarizerPage() {
  const [patterns, setPatterns] = useState<PatternData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    fetch("/data/legal-patterns.json")
      .then((r) => r.json())
      .then(setPatterns);
  }, []);

  const handleAnalyze = () => {
    if (!patterns || !input.trim()) return;
    setLoading(true);
    setEntities([]);
    setSummary("");

    setTimeout(() => {
      const extracted = extractEntities(input, patterns.entities);
      setEntities(extracted);
      setSummary(summarize(input, patterns.stopwords));
      setLoading(false);
    }, 600);
  };

  const grouped = entities.reduce<Record<string, ExtractedEntity[]>>((acc, e) => {
    acc[e.type] = acc[e.type] || [];
    acc[e.type].push(e);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Legal Text Summarizer</h1>
        <p className="text-muted-foreground mt-1">
          Extract entities and summarize legal documents using regex, keyword scoring, and NLP.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Input Legal Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste a legal judgment, petition, or contract text here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
          />
          <Button onClick={handleAnalyze} disabled={loading || !patterns} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            Extract & Summarize
          </Button>
        </CardContent>
      </Card>

      {entities.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Extracted Entities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <h4 className="text-sm font-semibold capitalize mb-2 flex items-center gap-2">
                  {items[0]?.icon}
                  {type.replace(/_/g, " ")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <Badge key={i} variant="secondary">
                      {item.value}
                    </Badge>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">Extractive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Paste any legal document or judgment text.</p>
            <p>2. Regex patterns extract acts, sections, parties, dates, courts, and amounts.</p>
            <p>3. Keyword frequency scoring identifies important sentences.</p>
            <p>4. Top-scoring sentences are assembled into an extractive summary.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This tool is for research and educational purposes. Automated summaries and entity
              extractions may miss nuances. Always verify against the original document.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
