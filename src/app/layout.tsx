import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartFuel OS — AI-Powered Fuel Station Intelligence",
  description: "The enterprise-grade operating system for modern fuel operations. Real-time analytics, automated intelligence, and fraud prevention.",
  openGraph: {
    title: "SmartFuel OS — AI-Powered Fuel Station Intelligence",
    description: "The future of energy operations management.",
    url: "https://smartfuel-os.com",
    siteName: "SmartFuel OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartFuel OS",
    description: "AI-Powered Fuel Station Intelligence",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen selection:bg-primary/20`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
