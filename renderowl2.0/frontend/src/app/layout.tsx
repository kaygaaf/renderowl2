import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

import { AuthProvider } from "@/contexts/AuthContext"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Renderowl - AI Video Creation Platform",
  description: "Create stunning videos with AI. Generate scenes, apply templates, and edit with our powerful timeline editor.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <AuthProvider>
        <html lang="en" suppressHydrationWarning>
          <body className={inter.className}>{children}</body>
        </html>
      </AuthProvider>
    </ClerkProvider>
  )
}
