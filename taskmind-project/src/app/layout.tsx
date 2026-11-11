import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "TaskMind — Telegram-бот: умный список задач и напоминаний",
  description:
    "Умный список задач и напоминаний прямо в Telegram. Записывайте задачи обычными словами — бот сам распознает дату, время, приоритет и категорию, и вовремя напомнит.",
  keywords: [
    "Telegram бот",
    "список задач",
    "напоминания",
    "TaskMind",
    "планировщик",
    "todo бот",
    "продуктивность",
  ],
  authors: [{ name: "TaskMind" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "TaskMind — умный список задач и напоминаний в Telegram",
    description:
      "Записывайте задачи обычными словами — бот сам распознает время и напомнит вовремя.",
    siteName: "TaskMind",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskMind — умный список задач и напоминаний в Telegram",
    description:
      "Записывайте задачи обычными словами — бот сам распознает время и напомнит вовремя.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
