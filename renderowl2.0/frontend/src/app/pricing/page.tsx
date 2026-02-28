import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/landing/Footer"
import { Pricing } from "@/components/landing/Pricing"
import { Card, CardContent } from "@/components/ui/card"
import { Check } from "lucide-react"

export const dynamic = "force-dynamic"

const enterpriseFeatures = [
  "Unlimited team members",
  "Custom AI model training",
  "Dedicated account manager",
  "SLA with 99.9% uptime",
  "On-premise deployment option",
  "Advanced security features",
  "Custom integrations",
  "Priority feature requests",
]

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <Pricing />

        {/* Enterprise CTA */}
        <section className="py-24 bg-muted/50">
          <div className="container px-4 md:px-6">
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-4">Enterprise?</h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      Get a customized solution for your organization. Our team will work with you to meet your specific needs.
                    </p>
                    <a
                      href="mailto:sales@renderowl.app"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Contact Sales
                    </a>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">Enterprise includes:</h3>
                    <ul className="space-y-2">
                      {enterpriseFeatures.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24">
          <div className="container px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Pricing FAQ</h2>
            
            <div className="space-y-6">
              {[
                {
                  q: "Can I change plans at any time?",
                  a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
                },
                {
                  q: "What happens if I exceed my credits?",
                  a: "You can purchase additional credit packs or upgrade to a higher plan. We'll notify you when you're running low."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes, Pro plans come with a 14-day free trial. No credit card required to start."
                },
                {
                  q: "Can I get a refund?",
                  a: "We offer a 30-day money-back guarantee if you're not satisfied with our service."
                }
              ].map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
