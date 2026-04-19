import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.94 3.21 9.14 7.66 10.62.56.1.76-.24.76-.54v-1.88c-3.11.68-3.77-1.5-3.77-1.5-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.17 1.72 1.17 1 1.71 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.17-3 0-.3-.51-1.43.11-2.98 0 0 .96-.31 3.13 1.14.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.17-1.45 3.13-1.14 3.13-1.14.62 1.55.23 2.68.11 2.98.73.78 1.17 1.78 1.17 3 0 4.29-2.62 5.23-5.11 5.5.4.34.76 1.02.76 2.06v3.06c0 .3.2.65.77.54A11.26 11.26 0 0 0 23.25 11.75C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  )
}

export function GitHubSignInButton() {
  return (
    <form
      action={async () => {
        'use server'
        await signIn('github', { redirectTo: '/' })
      }}
    >
      <Button type="submit" variant="primary" className="w-full" size="lg">
        <GitHubLogo className="size-4" />
        Continue with GitHub
      </Button>
    </form>
  )
}
