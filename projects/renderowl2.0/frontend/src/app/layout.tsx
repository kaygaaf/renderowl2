import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Renderowl 2.0 - Video Editor",
  description: "Next-generation video editor built with Next.js 15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {clerkKey ? (
          <AuthProvider publishableKey={clerkKey}>
            {children}
          </AuthProvider>
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Error</h1>
              <p className="text-gray-600">
                Clerk authentication is not configured. Please set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
              </p>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
