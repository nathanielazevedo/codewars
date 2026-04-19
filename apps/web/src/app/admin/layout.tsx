import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, Puzzle, Users } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/')

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-56 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex flex-col">
        <div className="p-5 border-b border-border/60">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-display font-bold text-lg"
          >
            <LayoutDashboard className="size-5 text-primary" />
            Admin
          </Link>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          <AdminNavItem href="/admin/problems" icon={<Puzzle className="size-4" />}>
            Problems
          </AdminNavItem>
          <AdminNavItem href="/admin/users" icon={<Users className="size-4" />}>
            Users
          </AdminNavItem>
        </nav>
        <div className="p-3 border-t border-border/60">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function AdminNavItem({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
