import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "SparkVotEDU - Ignite Student Voice Through Voting",
  description:
    "Interactive brackets and polls that spark student engagement in any classroom. Create tournaments, polls, and predictions — students join with a simple code.",
  openGraph: {
    title: "SparkVotEDU - Ignite Student Voice Through Voting",
    description:
      "Interactive brackets and polls that spark student engagement in any classroom. Create tournaments, polls, and predictions — students join with a simple code.",
    type: "website",
    images: [
      {
        url: "/logo-horizontal.png",
        width: 2880,
        height: 1620,
        alt: "SparkVotEDU - Ignite Student Voice Through Voting",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
