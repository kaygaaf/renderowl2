"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "/month",
    features: [
      "5 videos per month",
      "720p export quality",
      "Basic templates",
      "Community support",
      "Watermark on exports",
    ],
    cta: "Get Started",
    href: "/auth?mode=signup",
    popular: false,
  },
  {
    name: "Pro",
    description: "For serious creators",
    price: "$29",
    period: "/month",
    features: [
      "Unlimited videos",
      "4K export quality",
      "All premium templates",
      "AI scene generation",
      "Brand kit",
      "Priority support",
      "No watermark",
    ],
    cta: "Start Free Trial",
    href: "/auth?mode=signup&plan=pro",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For teams and businesses",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "API access",
      "Dedicated support",
      "Team collaboration",
      "SSO & advanced security",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@renderowl.app",
    popular: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Start free, upgrade when you need more power
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl border p-8 ${
                plan.popular
                  ? "border-blue-600 shadow-lg shadow-blue-600/10"
                  : "bg-white"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-sm font-medium text-white">
                    <Sparkles className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                <Link
                  href={plan.href}
                  className={
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      : ""
                  }
                >
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
