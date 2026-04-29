"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download, ExternalLink, Briefcase, GraduationCap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const projects = [
  {
    title: "DiagnoChat",
    description: "A multilingual, multimodal disease diagnosis chatbot using Bernoulli Naive Bayes and NLP. Supports text/image symptom input with real-time predictions.",
    href: "/diagnochat",
    tags: ["Machine Learning", "NLP", "Healthcare", "Naive Bayes"],
  },
  {
    title: "BNSS Offense Classifier",
    description: "Classifies offenses under 358 sections of the Bharatiya Nyaya Sanhita (2023) using TF-IDF and GloVe embeddings. Auto-generates legal documents.",
    href: "/bnss-classifier",
    tags: ["NLP", "Legal AI", "TF-IDF", "GloVe"],
  },
  {
    title: "Legal Text Summarizer",
    description: "Extracts entities (acts, sections, parties) from legal documents using regex, POS tagging, and word embeddings. Generates concise case summaries.",
    href: "/legal-summarizer",
    tags: ["Entity Extraction", "BART", "Regex", "POS Tagging"],
  },
];

const skills = [
  "Python", "R", "SQL", "Prolog", "TensorFlow", "Keras", "Scikit-learn",
  "NLTK", "SpaCy", "Hugging Face", "NLP", "LLMs", "RAG", "Prompt Engineering",
  "Deep Learning", "Computer Vision", "Time Series", "Legal Reasoning",
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-muted/30 py-24 md:py-32">
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
            <p className="text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              I build AI-powered tools at the intersection of law, healthcare, and data science.
              From disease diagnosis chatbots to legal offense classifiers and text summarizers,
              my work focuses on democratizing access to complex systems through machine learning.
            </p>
            <div className="flex flex-wrap gap-4">
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
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.href} href={project.href} className="group">
                  <Card className="h-full transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {project.title}
                      </CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
                  <GraduationCap className="h-6 w-6 text-primary mt-1" />
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
                  <Briefcase className="h-6 w-6 text-primary mt-1" />
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
                  <Award className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Achievements</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>University Gold Medal Recipient — L.L.B</li>
                      <li>University Gold Medal Recipient — B.C.A</li>
                      <li>AWS AI ML Fellow 2023-2024</li>
                      <li>WiBD Shakti Fellow 2024</li>
                      <li>VU Amsterdam Summer School Scholarship</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
