import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import AudioControls from "@/components/AudioControls";
import MusicDirector from "@/components/MusicDirector";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "GeoPolitics · Ten Nations. One Throne.",

  description:
    "A single-player world conquest strategy game.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={
        `${geistSans.variable} ` +
        `${geistMono.variable} h-full antialiased`
      }
    >
      <body className="min-h-full flex flex-col">
        <MusicDirector />

        {children}


        <AudioControls />
      </body>
    </html>
  );
}