import Link from 'next/link'
import { ChevronRight, Puzzle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminPage() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage problems and user accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminCard
          href="/admin/problems"
          icon={<Puzzle className="size-5 text-primary" />}
          title="Problems"
          body="Create, edit, and curate the problem pool."
        />
        <AdminCard
          href="/admin/users"
          icon={<Users className="size-5 text-secondary" />}
          title="Users"
          body="View accounts, adjust ELO, grant admin."
        />
      </div>
    </div>
  )
}

function AdminCard({
  href,
  icon,
  title,
  body,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-lg bg-muted/50 border border-border grid place-items-center group-hover:border-primary/40 transition-colors">
              {icon}
            </div>
            <div>
              <h2 className="font-display font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </CardContent>
      </Card>
    </Link>
  )
}
