"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Cpu,
  Languages,
  Video,
  Database,
  Brain,
  Play,
  Pause,
  Square,
  Volume2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ContentEntry {
  topic: string;
  grade: number;
  lang: string;
  content: string;
}

const topics = [
  "Photosynthesis",
  "Gravity",
  "The Solar System",
  "The Human Heart",
  "Fractions",
];

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "pa", name: "Punjabi" },
];

function mapGradeToAvailable(grade: number): number {
  if (grade <= 2) return 1;
  if (grade <= 6) return 4;
  if (grade <= 10) return 8;
  return 12;
}

const metrics = [
  { label: "Perplexity", value: "9.72", description: "Fluent, coherent generation" },
  { label: "BLEU", value: "0.032", description: "High paraphrase diversity" },
  { label: "ROUGE-1 F1", value: "0.121", description: "Token-level alignment" },
  { label: "ROUGE-L F1", value: "0.108", description: "Sequence structure retention" },
];

const translationScores = [
  { lang: "Hindi", score: "0.617", flag: "🇮🇳" },
  { lang: "Kannada", score: "0.536", flag: "🇮🇳" },
  { lang: "Telugu", score: "0.533", flag: "🇮🇳" },
  { lang: "Bengali", score: "0.532", flag: "🇮🇳" },
  { lang: "Punjabi", score: "0.508", flag: "🇮🇳" },
  { lang: "Tamil", score: "0.504", flag: "🇮🇳" },
];

const techStack = [
  { icon: Brain, label: "TinyLlama-1.1B", desc: "Base LLM fine-tuned with QLoRA (4-bit)" },
  { icon: Database, label: "FAISS + MiniLM", desc: "Dense retrieval over Wikipedia corpus" },
  { icon: Cpu, label: "GPT-4o Mini", desc: "Grade-level paraphrasing & question augmentation" },
  { icon: Languages, label: "MyMemory API", desc: "Round-trip validated translation to 6 languages" },
  { icon: Video, label: "edge-tts + ffmpeg", desc: "Typewriter animation with narration video" },
  { icon: BookOpen, label: "Wikipedia API", desc: "Curriculum-aligned knowledge source" },
];

export default function EduRAGPage() {
  const [dataset, setDataset] = useState<ContentEntry[]>([]);
  const [topic, setTopic] = useState("Photosynthesis");
  const [grade, setGrade] = useState(8);
  const [language, setLanguage] = useState("en");
  const [displayedContent, setDisplayedContent] = useState("");
  const [fullContent, setFullContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fallbackLang, setFallbackLang] = useState<string | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load dataset
  useEffect(() => {
    fetch("/data/edu-rag-content.json")
      .then((res) => res.json())
      .then((data: ContentEntry[]) => setDataset(data))
      .catch(() => setDataset([]));
  }, []);

  // Load speech synthesis voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const loadVoices = () => {
      setVoicesLoaded(true);
    };

    if (synth.getVoices().length > 0) {
      loadVoices();
    } else {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      synth.cancel();
    };
  }, []);

  const findContent = useCallback(
    (selectedTopic: string, selectedGrade: number, selectedLang: string) => {
      const mappedGrade = mapGradeToAvailable(selectedGrade);
      let entry = dataset.find(
        (d) => d.topic === selectedTopic && d.grade === mappedGrade && d.lang === selectedLang
      );
      let fallback: string | null = null;
      if (!entry && selectedLang !== "en") {
        entry = dataset.find(
          (d) => d.topic === selectedTopic && d.grade === mappedGrade && d.lang === "en"
        );
        if (entry) fallback = "en";
      }
      return { entry, fallback };
    },
    [dataset]
  );

  const stopTyping = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    setIsTyping(false);
  }, []);

  const stopAudio = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const generateContent = useCallback(() => {
    stopTyping();
    stopAudio();
    setDisplayedContent("");
    setFallbackLang(null);

    const { entry, fallback } = findContent(topic, grade, language);
    if (!entry) {
      setFullContent("Content not available for this combination. Try a different topic or language.");
      setDisplayedContent("Content not available for this combination. Try a different topic or language.");
      return;
    }

    setFallbackLang(fallback);
    setFullContent(entry.content);
    setIsTyping(true);

    let index = 0;
    const text = entry.content;
    setDisplayedContent("");

    typingRef.current = setInterval(() => {
      index++;
      if (index <= text.length) {
        setDisplayedContent(text.slice(0, index));
      } else {
        stopTyping();
      }
    }, 25);
  }, [topic, grade, language, findContent, stopTyping, stopAudio]);

  const playAudio = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth || !fullContent) return;

    if (isPaused && utteranceRef.current) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(fullContent);
    utteranceRef.current = utterance;

    // Select voice based on language
    const voices = synth.getVoices();
    const langCode = fallbackLang || language;
    const langPrefix =
      langCode === "en" ? "en" :
      langCode === "hi" ? "hi" :
      langCode === "bn" ? "bn" :
      langCode === "ta" ? "ta" :
      langCode === "te" ? "te" :
      langCode === "kn" ? "kn" :
      langCode === "pa" ? "pa" : "en";

    const voice = voices.find((v) => v.lang.startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith(langPrefix + "-")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = langPrefix + "-IN";
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, [fullContent, language, fallbackLang, isPaused]);

  const pauseAudio = useCallback(() => {
    window.speechSynthesis?.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stopAll = useCallback(() => {
    stopTyping();
    stopAudio();
    setDisplayedContent(fullContent);
  }, [stopTyping, stopAudio, fullContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
      window.speechSynthesis?.cancel();
    };
  }, [stopTyping]);

  const mappedGrade = mapGradeToAvailable(grade);
  const { entry: previewEntry } = findContent(topic, grade, language);
  const hasContent = !!previewEntry;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">Master Thesis Project</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            EduRAG Tutor
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Fine-Tuning LLM with RAG for Generating Educational Audio-Visual Content
          </p>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            An AI-powered learning assistant that delivers curriculum-aligned, grade-specific
            explanations in 7 languages with narrated educational videos — fine-tuned on 346K+
            QA pairs using QLoRA on consumer hardware.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="https://github.com/RudraniGhosh24/edu-rag-tutor"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>
      </motion.div>

      {/* Interactive Tool */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Try the EduRAG Tutor</h2>
        </div>

        <Card className="border-2 border-primary/10">
          <CardContent className="p-6 space-y-6">
            {/* Controls */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Grade Level: {grade}
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Class 1</span>
                  <span>Mapped: Class {mappedGrade}</span>
                  <span>Class 12</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateContent}
              disabled={isTyping || dataset.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              {isTyping ? "Generating..." : "Generate Lesson"}
            </Button>

            {/* Content Display */}
            {(displayedContent || fullContent) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {topic} · Class {mappedGrade}
                    </Badge>
                    {fallbackLang && (
                      <Badge variant="secondary" className="text-xs">
                        Fallback: {languages.find((l) => l.code === fallbackLang)?.name}
                      </Badge>
                    )}
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-2">
                    {voicesLoaded && window.speechSynthesis && (
                      <>
                        {!isPlaying && !isPaused && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={playAudio}
                            disabled={!displayedContent && !fullContent}
                            className="gap-2"
                          >
                            <Volume2 className="h-4 w-4" />
                            <Play className="h-3 w-3" />
                            Narrate
                          </Button>
                        )}
                        {isPlaying && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={pauseAudio}
                            className="gap-2"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        )}
                        {isPaused && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={playAudio}
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Resume
                          </Button>
                        )}
                        {(isPlaying || isPaused) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={stopAll}
                            className="gap-2"
                          >
                            <Square className="h-4 w-4" />
                            Stop
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="relative min-h-[120px] rounded-lg bg-muted/50 p-5">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {displayedContent}
                    {isTyping && (
                      <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </p>
                </div>

                {!hasContent && displayedContent && (
                  <p className="text-sm text-muted-foreground">
                    Note: Full dataset covers Classes 1, 4, 8, and 12. Your selection is mapped to the nearest available grade.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Architecture */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Architecture</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">Wikipedia Extraction</p>
                    <p className="text-sm text-muted-foreground">5,782 CBSE/ICSE topics fetched via Wikipedia API</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">BART Coherence Enhancement</p>
                    <p className="text-sm text-muted-foreground">Raw text cleaned and rewritten for readability</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">GPT-4o Mini Grade Adaptation</p>
                    <p className="text-sm text-muted-foreground">12 progressively complex versions per topic</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium">Question Paraphrasing</p>
                    <p className="text-sm text-muted-foreground">5 semantic variations per topic-grade pair</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">5</div>
                  <div>
                    <p className="font-medium">QLoRA Fine-Tuning</p>
                    <p className="text-sm text-muted-foreground">TinyLlama 1.1B fine-tuned on 346,920 QA pairs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">6</div>
                  <div>
                    <p className="font-medium">RAG + Web Search + AV Output</p>
                    <p className="text-sm text-muted-foreground">FAISS retrieval, DuckDuckGo fallback, typewriter videos</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tech Stack */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Tech Stack</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {techStack.map((tech) => (
            <Card key={tech.label} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <tech.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tech.label}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tech.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 mb-12">
        {/* Evaluation Metrics */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-6">Evaluation Metrics</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {metrics.map((m) => (
                  <div key={m.label} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{m.value}</p>
                    <p className="text-sm font-medium mt-1">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Translation BLEU Scores */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-6">Translation Quality</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Back-translation BLEU scores for round-trip validation across Indian languages:
              </p>
              <div className="space-y-3">
                {translationScores.map((t) => (
                  <div key={t.lang} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.flag}</span>
                      <span className="text-sm font-medium">{t.lang}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${parseFloat(t.score) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">{t.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Key Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Key Contributions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Consumer-Grade Fine-Tuning</h3>
              <p className="text-sm text-muted-foreground">
                Achieved effective domain adaptation of a 1.1B parameter model using QLoRA
                with 4-bit quantization, enabling training on a MacBook Pro M2 with 16GB unified memory.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Scalable Data Augmentation</h3>
              <p className="text-sm text-muted-foreground">
                Automated pipeline expanded 5,782 topics into 346,920 diverse QA pairs through
                systematic grade adaptation and neural paraphrasing.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Multimodal Output</h3>
              <p className="text-sm text-muted-foreground">
                Extended text generation into audio-visual educational content with synchronized
                typewriter animations and multilingual TTS narration.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">RAG with Triple Fallback</h3>
              <p className="text-sm text-muted-foreground">
                Hybrid retrieval system combines FAISS-based semantic search, real-time DuckDuckGo
                web search, and direct Wikipedia fetching for maximum coverage.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Footer */}
      <section className="py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Submitted in partial fulfillment of the requirements for the degree of
              Master of Science in Data Science, VIT Vellore, May 2025.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supervisor: Dr. Sathyanarayana Sharma K, School of Advanced Sciences.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolio
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
