import Link from 'next/link'
import { ArrowLeft, Swords } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DevSignIn } from '@/components/dev-signin'
import { GitHubSignInButton } from '@/components/github-signin-button'
import { Card, CardContent } from '@/components/ui/card'

export default async function SignInPage() {
  const session = await auth()
  if (session?.user) redirect('/')

  return (
    <main className="relative min-h-screen flex flex-col arena-bg">
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-glow-sm">
          <CardContent className="p-8">
            <div className="flex justify-center mb-5">
              <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow">
                <Swords className="size-5 text-background" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-center">Enter the Arena</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
              Sign in to create a room and challenge your rivals.
            </p>
            <GitHubSignInButton />
            <DevSignIn />
            <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
              By signing in, you agree to our{' '}
              <Link
                href="/conduct"
                className="text-primary hover:underline underline-offset-2"
              >
                Code of Conduct
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
