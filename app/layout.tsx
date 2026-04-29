import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rudrani Ghosh | Legal AI & Healthcare ML Researcher",
  description: "Portfolio of Rudrani Ghosh — Data Scientist, Programmer, and Lawyer building AI-powered tools at the intersection of law, healthcare, and data science. Explore interactive research demos.",
  keywords: ["Rudrani Ghosh", "Legal AI", "Healthcare ML", "Data Science", "NLP", "Machine Learning", "Portfolio"],
  authors: [{ name: "Rudrani Ghosh" }],
  openGraph: {
    title: "Rudrani Ghosh | Legal AI & Healthcare ML Researcher",
    description: "Data Scientist · Programmer · Lawyer. Building AI-powered tools for legal reasoning, healthcare diagnosis, and NLP.",
    type: "website",
    url: "https://www.rudranig.com",
    siteName: "Rudrani Ghosh",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rudrani Ghosh | Legal AI & Healthcare ML Researcher",
    description: "Data Scientist · Programmer · Lawyer. Explore interactive ML research tools.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
