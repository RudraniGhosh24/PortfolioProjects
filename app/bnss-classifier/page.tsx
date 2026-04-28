"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Gavel, ShieldAlert, Scale, BookOpen } from "lucide-react";
import { jsPDF } from "jspdf";

interface Provision {
  bnss_section: string;
  offense: string;
  punishment: string;
  cognizable: string;
  bailable: string;
  court: string;
}

interface BNSSData {
  provisions: Provision[];
}

const STOPWORDS = new Set([
  "the", "and", "or", "of", "to", "in", "a", "is", "that", "for", "it", "with", "as", "was", "on", "be", "by",
  "this", "from", "at", "an", "has", "have", "had", "not", "are", "but", "were", "been", "their", "they", "we",
  "he", "she", "his", "her", "him", "them", "which", "who", "when", "where", "what", "how", "all", "any", "can",
  "shall", "may", "will", "would", "could", "should", "there", "than", "so", "if", "no", "yes", "up", "out", "down",
  "over", "under", "again", "further", "then", "once", "here", "why", "off", "also", "into", "through", "during",
  "before", "after", "above", "below", "between", "among", "until", "while", "about", "against", "such", "only",
  "own", "same", "too", "very", "just", "now",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function computeTfIdf(docs: string[][]): Record<string, number>[] {
  const df: Record<string, number> = {};
  const N = docs.length;

  for (const doc of docs) {
    const seen = new Set<string>();
    for (const term of doc) {
      if (!seen.has(term)) {
        df[term] = (df[term] || 0) + 1;
        seen.add(term);
      }
    }
  }

  const idf: Record<string, number> = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log(N / (count || 1));
  }

  return docs.map((doc) => {
    const tf: Record<string, number> = {};
    for (const term of doc) {
      tf[term] = (tf[term] || 0) + 1;
    }
    const vec: Record<string, number> = {};
    for (const term of Object.keys(tf)) {
      vec[term] = tf[term] * (idf[term] || 0);
    }
    return vec;
  });
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const k of Object.keys(a)) {
    normA += a[k] * a[k];
    if (b[k] !== undefined) {
      dot += a[k] * b[k];
    }
  }
  for (const k of Object.keys(b)) {
    normB += b[k] * b[k];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default function BNSSClassifierPage() {
  const [data, setData] = useState<BNSSData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Provision | null>(null);
  const [score, setScore] = useState(0);
  const [vectors, setVectors] = useState<Record<string, number>[]>([]);

  useEffect(() => {
    fetch("/data/bnss-dataset.json")
      .then((r) => r.json())
      .then((d: BNSSData) => {
        setData(d);
        const docs = d.provisions.map((p) => tokenize(p.offense));
        setVectors(computeTfIdf(docs));
      });
  }, []);

  const handleClassify = () => {
    if (!data || vectors.length === 0 || !input.trim()) return;
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      const userTokens = tokenize(input);
      const userVec = computeTfIdf([userTokens])[0];

      let bestIndex = -1;
      let bestScore = -1;

      for (let i = 0; i < vectors.length; i++) {
        const sim = cosineSimilarity(userVec, vectors[i]);
        if (sim > bestScore) {
          bestScore = sim;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        setResult(data.provisions[bestIndex]);
        setScore(bestScore);
      }
      setLoading(false);
    }, 500);
  };

  const generateFIR = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("FIRST INFORMATION REPORT (FIR)", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Section: ${result.bnss_section} of Bharatiya Nyaya Sanhita`, 20, 45);
    doc.text(`Offense: ${result.offense.substring(0, 120)}...`, 20, 55);
    doc.text(`Punishment: ${result.punishment.substring(0, 120)}`, 20, 65);
    doc.text(`Cognizable: ${result.cognizable} | Bailable: ${result.bailable}`, 20, 75);
    doc.text(`Triable by: ${result.court}`, 20, 85);
    doc.text("This is a computer-generated draft for research purposes.", 20, 105);
    doc.save(`FIR_Section_${result.bnss_section}.pdf`);
  };

  const generateBail = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BAIL BOND / BAIL APPLICATION", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Section: ${result.bnss_section} of Bharatiya Nyaya Sanhita`, 20, 45);
    doc.text(`Offense: ${result.offense.substring(0, 120)}...`, 20, 55);
    doc.text(`Bailable: ${result.bailable}`, 20, 65);
    doc.text(`Triable by: ${result.court}`, 20, 75);
    doc.text("The applicant undertakes to appear before the court as and when required.", 20, 90);
    doc.text("This is a computer-generated draft for research purposes.", 20, 105);
    doc.save(`Bail_Section_${result.bnss_section}.pdf`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">BNSS Offense Classifier</h1>
        <p className="text-muted-foreground mt-1">
          Classify offenses under the Bharatiya Nyaya Sanhita (2023) using TF-IDF and cosine similarity.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Describe the Offense
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe the incident in plain language (e.g., 'A group of five people broke into a house at night and stole jewelry')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
          />
          <Button onClick={handleClassify} disabled={loading || !data} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            Classify Offense
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Matched Provision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Section {result.bnss_section}</Badge>
              <Badge variant="outline">Similarity: {(score * 100).toFixed(2)}%</Badge>
            </div>
            <p className="text-sm leading-relaxed">{result.offense}</p>
            <Separator />
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Punishment</p>
                  <p className="text-muted-foreground">{result.punishment}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Scale className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Cognizable</p>
                  <p className="text-muted-foreground">{result.cognizable}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Scale className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Bailable</p>
                  <p className="text-muted-foreground">{result.bailable}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Gavel className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Court</p>
                  <p className="text-muted-foreground">{result.court}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={generateFIR} className="gap-2">
                <FileText className="h-4 w-4" />
                Download FIR Draft
              </Button>
              <Button variant="outline" size="sm" onClick={generateBail} className="gap-2">
                <FileText className="h-4 w-4" />
                Download Bail Bond Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Enter a description of the incident in everyday language.</p>
            <p>2. The text is tokenized and stopwords are removed.</p>
            <p>3. TF-IDF vectors are computed for the input and all 443 BNSS provisions.</p>
            <p>4. Cosine similarity identifies the most relevant legal section.</p>
            <p>5. Auto-generate draft FIR or bail bond as a PDF.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This tool is for research and educational purposes. Legal documents generated here
              are drafts and must be reviewed by a qualified legal practitioner before use in any
              official proceeding.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
