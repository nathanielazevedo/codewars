import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Swords } from 'lucide-react'

export const metadata = {
  title: 'Code of Conduct · Code Arena',
}

export default function ConductPage() {
  return (
    <main className="relative min-h-screen arena-bg">
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-3 border-b border-border/60 backdrop-blur-sm bg-background/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Code<span className="text-primary">Arena</span>
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </header>

      <article className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg bg-primary/15 border border-primary/40 grid place-items-center">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">
              Code of Conduct
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Last updated 2026-04-25
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-base text-foreground/90">
            Code Arena is a competitive coding platform. Trash talk and rivalry are part of
            the fun — abuse is not. Read this before signing in.
          </p>

          <h2 className="font-display mt-8">What's allowed</h2>
          <ul>
            <li>Smack talk in chat. Calling out a friend after a win is fine.</li>
            <li>Spectating any public match.</li>
            <li>Strategizing in private rooms with people you invited.</li>
            <li>Losing badly and making jokes about it.</li>
          </ul>

          <h2 className="font-display mt-8">What's not allowed</h2>
          <ol>
            <li>
              <strong>Slurs and hate speech.</strong> Any language targeting race, ethnicity,
              gender identity, sexual orientation, religion, disability, or nationality.
              No exceptions, no "just kidding."
            </li>
            <li>
              <strong>Harassment.</strong> Repeatedly targeting another user with insults,
              threats, or unwanted contact — even if no individual message crosses a line.
            </li>
            <li>
              <strong>Doxxing.</strong> Posting another person's real name, address, phone
              number, employer, or any private info. Including yours, if it endangers you.
            </li>
            <li>
              <strong>Sexual content.</strong> Code Arena is not the place. Don't post,
              link, or solicit it.
            </li>
            <li>
              <strong>Threats of violence.</strong> Toward anyone, real or hypothetical.
            </li>
            <li>
              <strong>Scams, spam, phishing.</strong> No promoting external paid services,
              no "free coins" links, no Discord invites that are actually malware.
            </li>
            <li>
              <strong>Cheating.</strong> No alt accounts to manipulate ELO, no asking
              others to throw matches, no scraping problem solutions and pasting them
              under timer. The platform exists to help you get better — bypassing the
              learning is just lying to yourself.
            </li>
            <li>
              <strong>Impersonation.</strong> Don't pretend to be Code Arena staff, another
              specific user, or a public figure.
            </li>
          </ol>

          <h2 className="font-display mt-8">What we do about it</h2>
          <p>
            We log all chat server-side. Reports are reviewed against the rules above. Depending
            on severity:
          </p>
          <ul>
            <li>
              <strong>First minor offense:</strong> message removed, warning DM, no other action.
            </li>
            <li>
              <strong>Repeated minor offenses or any major offense:</strong> chat mute (24h to
              permanent depending on severity).
            </li>
            <li>
              <strong>Severe violations</strong> (slurs, threats, doxxing, sexual content
              targeting minors, scams that cause real harm): immediate permanent ban, no appeal.
            </li>
            <li>
              <strong>Cheating</strong>: ELO and rank reset, account flagged. Repeat: ban.
            </li>
          </ul>
          <p>
            We do not owe an explanation for any specific moderation action and do not promise
            individual response times.
          </p>

          <h2 className="font-display mt-8">How to report</h2>
          <p>
            Found a chat message that violates the rules? Email{' '}
            <a href="mailto:abuse@codearena.local" className="text-primary hover:underline">
              abuse@codearena.local
            </a>{' '}
            with a screenshot, the room/match ID if you have it, and a one-line description.
            That's it.
          </p>
          <p>
            If you or someone else is in immediate danger, contact your local emergency
            services first. Code Arena cannot intervene in real-world incidents.
          </p>

          <h2 className="font-display mt-8">Privacy quick note</h2>
          <p>
            Account data we store: your username, email, OAuth provider ID, ELO/XP/rank, your
            match history, and your chat messages. Nothing else. We do not sell or share this
            data with third parties.
          </p>

          <h2 className="font-display mt-8">Changes to this policy</h2>
          <p>
            We may update these rules. Material changes will be announced on the home page
            for at least 7 days before they take effect.
          </p>

          <p className="mt-10 text-xs text-muted-foreground border-t border-border/60 pt-6">
            By signing in to Code Arena, you agree to these rules. If you don't agree, please
            don't sign in.
          </p>
        </div>
      </article>
    </main>
  )
}
