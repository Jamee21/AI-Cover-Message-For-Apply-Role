import type { Metadata } from "next";
import { Figtree, Literata } from "next/font/google";
import "./globals.css";

// Figtree = interface text, Literata = the letter itself.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });

export const metadata: Metadata = {
  title: "Draftly — Career Writing Studio",
  description: "Upload or paste your resume and a job description to create a tailored cover letter grounded in your experience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${literata.variable}`}>
      <body>{children}</body>
    </html>
  );
}