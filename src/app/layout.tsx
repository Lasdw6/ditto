import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Geist } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Your Chemical Romance",
  description:
    "A neon dating platform where people swipe on date ideas and an AI concierge turns chemistry into conversations.",
  icons: {
    icon: "/brand-extracted/favicon-transparent.png",
    shortcut: "/brand-extracted/favicon-transparent.png",
    apple: "/brand-extracted/favicon-transparent.png",
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
      className={cn("h-full", "antialiased", spaceGrotesk.variable, plexMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full bg-background text-foreground">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
