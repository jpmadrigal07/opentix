import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getBaseUrl } from "@/lib/metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: "%s - Opentix",
    default: "Opentix",
  },
  description: "Git-native ticket management for VS Code. Manage your tickets directly in your repository with a beautiful Kanban board.",
  keywords: [
    "VS Code extension",
    "ticket management",
    "git-native",
    "kanban board",
    "project management",
    "issue tracking",
    "developer tools",
    "markdown tickets",
  ],
  authors: [{ name: "Opentix Team" }],
  creator: "Opentix",
  publisher: "Opentix",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Opentix",
    title: "Opentix - Git-native ticket management for VS Code",
    description: "Git-native ticket management for VS Code. Manage your tickets directly in your repository with a beautiful Kanban board.",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "Opentix Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Opentix - Git-native ticket management for VS Code",
    description: "Git-native ticket management for VS Code. Manage your tickets directly in your repository with a beautiful Kanban board.",
    images: ["/icon.png"],
    creator: "@opentix", // Update with your actual Twitter handle
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
  alternates: {
    canonical: baseUrl,
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
        <ThemeProvider defaultTheme="dark" attribute="class" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
