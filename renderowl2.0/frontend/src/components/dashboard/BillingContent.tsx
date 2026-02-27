"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Check, Sparkles, Zap, Building2, Download, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For hobbyists and trying out",
    features: ["5 videos/month", "720p exports", "Basic templates", "Community support"],
    current: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For serious creators",
    features: ["Unlimited videos", "4K exports", "All templates", "AI generation", "Priority support"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For teams and businesses",
    features: ["Everything in Pro", "API access", "Custom integrations", "Dedicated support", "SLA"],
    current: false,
  },
]

const invoices = [
  { id: "INV-001", date: "Feb 1, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-002", date: "Jan 1, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-003", date: "Dec 1, 2023", amount: "$29.00", status: "Paid" },
]

export function BillingContent() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>You are currently on the Pro plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-600/10 to-purple-600/10 border">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Pro Plan</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">$29/month • Renews on March 1, 2024</p>
            </div>
            <Button variant="outline">Manage Subscription</Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Credits Used</span>
              <span className="font-medium">850 / 1,000</span>
            </div>
            <Progress value={85} className="h-2" />
            <p className="text-sm text-muted-foreground">
              150 credits remaining this month
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <Tabs defaultValue="plans" className="w-full">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Method</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="relative h-6 w-11 rounded-full bg-primary transition-colors"
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  billingCycle === "yearly" ? "translate-x-5" : ""
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}`}>
              Yearly
            </span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Save 20%</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.current ? "border-blue-600" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{billingCycle === "yearly" ? "/year" : "/month"}</span>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.current ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                      {plan.name === "Enterprise" ? "Contact Sales" : "Upgrade"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Invoice</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t">
                        <td className="p-4 font-medium">{invoice.id}</td>
                        <td className="p-4">{invoice.date}</td>
                        <td className="p-4">{invoice.amount}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {invoice.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Default</span>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
              
              <Button variant="outline">
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
