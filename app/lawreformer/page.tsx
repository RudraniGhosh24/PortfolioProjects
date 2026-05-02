"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Gavel,
  MessageSquare,
  FileText,
  Calendar,
  Scale,
  Globe,
  Volume2,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: MessageSquare,
    title: "AI Legal Assistant",
    description:
      "Multilingual, audio-supported chatbot that answers legal questions in plain language. Supports Hindi, Bengali, Tamil, Telugu, Kannada, and Punjabi with text-to-speech narration.",
  },
  {
    icon: FileText,
    title: "Clause Analysis",
    description:
      "Upload legal documents to automatically detect and highlight key clauses — payment terms, jurisdiction, termination, liability, indemnity, and more — with risk scoring.",
  },
  {
    icon: Calendar,
    title: "Statutory Deadlines",
    description:
      "Interactive calculator that computes filing deadlines, limitation periods, and compliance dates under Indian law (CrPC, CPC, BNSS, BNS) with automatic reminders.",
  },
  {
    icon: Scale,
    title: "Scenario Simulation",
    description:
      "Input a factual scenario and get AI-generated legal analysis including applicable laws, precedents, possible outcomes, and suggested next steps.",
  },
  {
    icon: Shield,
    title: "Offense Classifier",
    description:
      "Maps natural-language crime descriptions to relevant sections of the Bharatiya Nyaya Sanhita (2023) and Bharatiya Nagarik Suraksha Sanhita with punishment details.",
  },
  {
    icon: Users,
    title: "Access to Justice",
    description:
      "Designed for underserved populations — simplified interfaces, regional language support, and audio assistance for users with low literacy or visual impairment.",
  },
];

const techStack = [
  { label: "LLMs", desc: "GPT-4o / Claude for reasoning & drafting" },
  { label: "RAG", desc: "FAISS + embeddings over Indian legal corpus" },
  { label: "Speech", desc: "Web Speech API + edge-tts for narration" },
  { label: "NLP", desc: "spaCy + regex for entity & clause extraction" },
  { label: "Frontend", desc: "Next.js + Tailwind + shadcn/ui" },
  { label: "Backend", desc: "Python FastAPI + PostgreSQL + Redis" },
];

export default function LawReformerPage() {
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
          <Badge variant="secondary" className="mb-3">Live Product</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3 flex items-center gap-3">
            <Gavel className="h-8 w-8 text-primary" />
            LawReformer
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            AI-powered legal assistance for underserved citizens and practitioners in India.
            Multilingual, audio-supported, and designed for access to justice.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="https://lawreformer.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Visit LawReformer
            </Button>
          </a>
          <a
            href="https://ai.lawreformer.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Try AI Assistant
            </Button>
          </a>
        </div>
      </motion.div>

      {/* Screenshots */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-12"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="h-56 overflow-hidden border-b">
              <img
                src="/images/lawreformer.jpg"
                alt="LawReformer homepage"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">LawReformer.com — Main Platform</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="h-56 overflow-hidden border-b">
              <img
                src="/images/ai-lawreformer.jpg"
                alt="AI LawReformer interface"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">AI LawReformer — Legal Assistant</p>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Core Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Tech Stack</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {techStack.map((tech) => (
                <div key={tech.label} className="space-y-1">
                  <p className="text-sm font-semibold">{tech.label}</p>
                  <p className="text-xs text-muted-foreground">{tech.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Impact */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Impact & Mission</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Multilingual Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Legal information is delivered in 6 Indian languages plus English,
                    breaking the language barrier that prevents millions from understanding their rights.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Volume2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Audio Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Text-to-speech narration enables users with low literacy or visual
                    impairment to access legal guidance through audio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Codified Law Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    Natural language queries are mapped to precise statutory provisions
                    across BNSS, BNS, CrPC, CPC, and specialized acts — with punishment and bail details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">User-Centered Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Built with empathy for non-lawyers — simplified language, step-by-step guidance,
                    and contextual help at every stage of the legal journey.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Footer CTA */}
      <section className="py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Founded by Rudrani Ghosh in February 2025. LawReformer is an ongoing initiative
              to democratize legal access through applied AI.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="https://lawreformer.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                lawreformer.com
              </Button>
            </a>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
