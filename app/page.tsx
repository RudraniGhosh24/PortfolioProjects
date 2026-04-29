"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  Mail,
  Code2,
  Database,
  MessageSquare,
  Gavel,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const projects = [
  {
    title: "DiagnoChat",
    impact: "Helps patients in underserved areas identify possible conditions in their native language before seeing a doctor.",
    description: "A multilingual, multimodal disease diagnosis chatbot using Bernoulli Naive Bayes and NLP. Supports text/image symptom input with real-time predictions.",
    href: "/diagnochat",
    githubCode: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/app/diagnochat",
    githubData: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/public/data/symptoms-dataset.json",
    tags: ["Machine Learning", "NLP", "Healthcare", "Naive Bayes"],
    preview: "chat",
  },
  {
    title: "BNSS Offense Classifier",
    impact: "Democratizes legal literacy by mapping everyday crime descriptions to 443 codified Bharatiya Nyaya Sanhita provisions in seconds.",
    description: "Classifies offenses under 358 sections of the Bharatiya Nyaya Sanhita (2023) using TF-IDF and synonym expansion. Auto-generates legal documents.",
    href: "/bnss-classifier",
    githubCode: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/app/bnss-classifier",
    githubData: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/public/data/bnss-dataset.json",
    tags: ["NLP", "Legal AI", "TF-IDF", "GloVe"],
    preview: "classifier",
  },
  {
    title: "Legal Text Summarizer",
    impact: "Reduces hours of legal document review into minutes by automatically extracting key entities and generating extractive summaries.",
    description: "Extracts entities (acts, sections, parties) from legal documents using regex, POS tagging, and word embeddings. Generates concise case summaries.",
    href: "/legal-summarizer",
    githubCode: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/app/legal-summarizer",
    githubData: "https://github.com/RudraniGhosh24/PortfolioProjects/tree/main/public/data/legal-patterns.json",
    tags: ["Entity Extraction", "BART", "Regex", "POS Tagging"],
    preview: "summarizer",
  },
];

const skillGroups = [
  {
    category: "Languages & Tools",
    items: ["Python", "R", "SQL", "Prolog", "Git/GitHub", "Jupyter"],
  },
  {
    category: "ML & Deep Learning",
    items: ["TensorFlow", "Keras", "Scikit-learn", "PyTorch", "OpenCV", "Computer Vision"],
  },
  {
    category: "NLP & LLMs",
    items: ["NLTK", "SpaCy", "Hugging Face", "LLMs", "RAG", "Prompt Engineering", "Fine-Tuning"],
  },
  {
    category: "Data Science",
    items: ["Pandas", "NumPy", "Matplotlib", "Seaborn", "Time Series", "Feature Engineering"],
  },
  {
    category: "Legal & Domain",
    items: ["Legal Reasoning", "Statutory Interpretation", "Jurisprudence", "Legal Research", "Drafting"],
  },
];

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function PreviewChat() {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">D</div>
        <div className="bg-muted rounded-lg px-2 py-1 text-[10px] text-muted-foreground max-w-[80%]">
          Describe your symptoms...
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-2 py-1 text-[10px] max-w-[80%]">
          fever, cough, headache
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">D</div>
        <div className="bg-muted rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
          Influenza (Flu) — 87.3%
        </div>
      </div>
    </div>
  );
}

function PreviewClassifier() {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
      <div className="h-6 bg-background rounded border px-2 text-[10px] flex items-center text-muted-foreground">
        4 men broke into my house...
      </div>
      <div className="bg-background rounded border p-2 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold">Section 331</span>
          <span className="text-[10px] text-green-600 font-medium">92.4%</span>
        </div>
        <div className="text-[9px] text-muted-foreground line-clamp-2">
          Lurking house-trespass or housebreaking...
        </div>
      </div>
    </div>
  );
}

function PreviewSummarizer() {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
      <div className="space-y-1">
        <div className="h-1.5 w-3/4 bg-background rounded" />
        <div className="h-1.5 w-1/2 bg-background rounded" />
        <div className="h-1.5 w-5/6 bg-background rounded" />
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Section 302</span>
        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Murder</span>
        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Sessions Court</span>
      </div>
    </div>
  );
}

const previewMap: Record<string, React.ReactNode> = {
  chat: <PreviewChat />,
  classifier: <PreviewClassifier />,
  summarizer: <PreviewSummarizer />,
};

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-muted/30 py-10 md:py-14">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Rudrani Ghosh
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-6">
              Data Scientist · Programmer · Lawyer
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mb-5 leading-relaxed">
              I build AI-powered tools at the intersection of law, healthcare, and data science.
              From disease diagnosis chatbots to legal offense classifiers and text summarizers,
              my work focuses on democratizing access to complex systems through machine learning.
            </p>
            <div className="flex flex-wrap gap-4 mb-5">
              <a href="/resume.pdf" download>
                <Button size="lg" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Resume
                </Button>
              </a>
              <Link href="/diagnochat">
                <Button variant="outline" size="lg" className="gap-2">
                  Explore Tools
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/RudraniGhosh24"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <GitHubIcon className="h-5 w-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/rudrani-ghosh/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkedInIcon className="h-5 w-5" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
              <a
                href="mailto:rudranighosh24@gmail.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="hidden sm:inline">rudranighosh24@gmail.com</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Projects */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">Research Tools</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Interactive implementations of the machine learning and NLP systems from my published research papers.
              Every tool includes source code and datasets on GitHub.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.href} className="h-full flex flex-col transition-shadow hover:shadow-lg overflow-hidden">
                  <div className="p-4 border-b bg-muted/30">
                    {previewMap[project.preview]}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle>
                      <Link href={project.href} className="hover:text-primary transition-colors">
                        {project.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-primary/80 mt-1">
                      {project.impact}
                    </CardDescription>
                    <CardDescription className="mt-2">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={project.githubCode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        View Code
                      </a>
                      <a
                        href={project.githubData}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Database className="h-3.5 w-3.5" />
                        Dataset
                      </a>
                      <Link
                        href={project.href}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        Try Demo
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Separator />

      {/* About */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-8">About Me</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <GraduationCap className="h-6 w-6 text-primary mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Education</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>M.Sc Data Science, VIT Vellore (CGPA: 9.19)</li>
                      <li>L.L.B, Techno India University (CGPA: 9.7)</li>
                      <li>B.C.A, Lovely Professional University (CGPA: 9.65)</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Briefcase className="h-6 w-6 text-primary mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Experience</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>Founder — <a href="https://lawreformer.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">LawReformer.com</a> (<a href="https://ai.lawreformer.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">ai.lawreformer.com</a>)</li>
                      <li>Founder — <a href="https://astroformer.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Astroformer.com</a></li>
                      <li>Freelance AI Trainer — Outlier (LLM evaluation)</li>
                      <li>ML Intern — Infosys Springboard (Healthcare fraud detection)</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Award className="h-6 w-6 text-primary mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Achievements</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>University Gold Medal Recipient — L.L.B (2019)</li>
                      <li>University Gold Medal Recipient — B.C.A (2023)</li>
                      <li>AWS AI ML Fellow (2023-2024)</li>
                      <li>WiBD Shakti Fellow (2024)</li>
                      <li>VU Amsterdam Summer School Scholarship (2024)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Skills</h3>
                  <div className="space-y-4">
                    {skillGroups.map((group) => (
                      <div key={group.category}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          {group.category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((skill) => (
                            <Badge key={skill} variant="outline" className="font-normal">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-24 border-t">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">Let&apos;s Work Together</h2>
            <p className="text-muted-foreground mb-8">
              I am available for freelance consulting, research collaborations, and full-time opportunities
              in Legal AI, Healthcare ML, and NLP. If you are building something at the intersection of
              law and technology, I would love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:rudranighosh24@gmail.com">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Mail className="h-4 w-4" />
                  Get In Touch
                </Button>
              </a>
              <a href="/resume.pdf" download>
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Download Resume
                </Button>
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8">
              <a
                href="https://github.com/RudraniGhosh24"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <GitHubIcon className="h-5 w-5" />
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/rudrani-ghosh/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkedInIcon className="h-5 w-5" />
                LinkedIn
              </a>
              <a
                href="mailto:rudranighosh24@gmail.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
                Email
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
