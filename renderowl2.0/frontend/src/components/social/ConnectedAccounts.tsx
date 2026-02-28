"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Youtube, 
  Twitter, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Music2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  accountId: string
  status: "connected" | "disconnected" | "expired" | "error"
  metadata?: {
    channelThumbnail?: string
    page_category?: string
  }
  createdAt: string
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

const platformColors = {
  youtube: "text-red-600 bg-red-50",
  twitter: "text-sky-500 bg-sky-50",
  instagram: "text-pink-600 bg-pink-50",
  facebook: "text-blue-600 bg-blue-50",
  linkedin: "text-blue-700 bg-blue-50",
  tiktok: "text-black bg-gray-100",
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/social/accounts")
      setAccounts(response.data.accounts || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load connected accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: string) => {
    setConnecting(platform)
    try {
      const response = await api.get(`/social/connect/${platform}`)
      const { url, state } = response.data
      
      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      const popup = window.open(
        url,
        `Connect ${platform}`,
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth callback
      const messageHandler = async (event: MessageEvent) => {
        if (event.data.type === "SOCIAL_OAUTH_CALLBACK") {
          popup?.close()
          window.removeEventListener("message", messageHandler)
          
          try {
            await api.post(`/social/callback/${platform}`, {
              code: event.data.code,
            })
            toast({
              title: "Success",
              description: `Connected to ${platform} successfully`,
            })
            fetchAccounts()
          } catch (error) {
            toast({
              title: "Error",
              description: `Failed to connect to ${platform}`,
              variant: "destructive",
            })
          }
        }
      }
      
      window.addEventListener("message", messageHandler)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate connection",
        variant: "destructive",
      })
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      await api.delete(`/social/accounts/${accountId}`)
      toast({
        title: "Success",
        description: "Account disconnected successfully",
      })
      fetchAccounts()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "expired":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const availablePlatforms = ["youtube", "tiktok", "instagram", "twitter", "linkedin", "facebook"]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Loading your connected social media accounts...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected social media accounts for one-click publishing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No accounts connected yet</p>
              <p className="text-sm">Connect your social media accounts to start publishing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => {
                const Icon = platformIcons[account.platform as keyof typeof platformIcons]
                const colorClass = platformColors[account.platform as keyof typeof platformColors]
                
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-lg", colorClass)}>
                        {Icon && <Icon className="h-6 w-6" />}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{account.platform}</p>
                        <p className="text-sm text-muted-foreground">{account.accountName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(account.status)}
                          <span className="text-xs capitalize">{account.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
          <CardDescription>Add more social media platforms to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availablePlatforms.map((platform) => {
              const isConnected = accounts.some((a) => a.platform === platform)
              const Icon = platformIcons[platform as keyof typeof platformIcons]
              const colorClass = platformColors[platform as keyof typeof platformColors]
              
              return (
                <Button
                  key={platform}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  disabled={isConnected || !!connecting}
                  onClick={() => handleConnect(platform)}
                >
                  <div className={cn("p-2 rounded-lg", colorClass)}>
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <span className="capitalize">{platform}</span>
                  {isConnected && (
                    <Badge variant="secondary" className="text-xs">Connected</Badge>
                  )}
                  {connecting === platform && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
