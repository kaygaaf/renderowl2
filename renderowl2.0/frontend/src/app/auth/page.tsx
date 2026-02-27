import { SignIn, SignUp } from "@clerk/nextjs"
import { Navbar } from "@/components/layout/Navbar"

export default function AuthPage({
  searchParams,
}: {
  searchParams: { mode?: string; plan?: string }
}) {
  const mode = searchParams.mode || "login"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {mode === "signup" ? (
            <SignUp 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-xl border rounded-2xl",
                  headerTitle: "text-2xl font-bold",
                  headerSubtitle: "text-muted-foreground",
                  formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  footerActionLink: "text-blue-600 hover:text-blue-700",
                }
              }}
              redirectUrl={searchParams.plan ? `/dashboard?plan=${searchParams.plan}` : "/dashboard"}
            />
          ) : (
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-xl border rounded-2xl",
                  headerTitle: "text-2xl font-bold",
                  headerSubtitle: "text-muted-foreground",
                  formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  footerActionLink: "text-blue-600 hover:text-blue-700",
                }
              }}
              redirectUrl="/dashboard"
            />
          )}
        </div>
      </main>
    </div>
  )
}
