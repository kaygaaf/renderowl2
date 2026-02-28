import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { ClerkProviderWrapper } from "@/components/ClerkWrapper"
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
    <ClerkProviderWrapper>
      <AuthProvider>
        <html lang="en" suppressHydrationWarning>
          <body className={inter.className}>{children}</body>
        </html>
      </AuthProvider>
    </ClerkProviderWrapper>
  )
}
