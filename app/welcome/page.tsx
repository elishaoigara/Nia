import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Africa Connects Here',
  description:
    'Nia is the community platform for African youth 18–35: Circles for music, football, tech, business and culture, with real opportunities, Flicks, stories and DMs. Free, data-light, on any phone.',
  openGraph: {
    title: 'Nia — Africa Connects Here',
    description: 'Communities that build you up, not scroll you down.',
    images: [{ url: '/logo/og-image.png', width: 1200, height: 630, alt: 'Nia — Africa Connects Here' }],
  },
}

const CIRCLES = [
  'Music', 'Football', 'Gaming', 'Comedy', 'Fashion', 'Film', 'Food',
  'Travel', 'Friendship', 'Art', 'Technology', 'Business', 'Careers',
  'Education', 'Books', 'Fitness', 'Culture',
]

const FEATURES = [
  {
    title: 'Circles',
    body: 'Purpose-led communities around what you love — music, football, tech, business, culture. Members, prompts, resources and real conversations.',
  },
  {
    title: 'Real opportunities',
    body: 'Gigs, scholarships, internships and events shared inside Circles — save them, RSVP, and get help applying from people who have done it.',
  },
  {
    title: 'Flicks & stories',
    body: 'Short video and stories made here — your music, your comedy, your fit, your food. Your crowd sees it first, not an algorithm.',
  },
  {
    title: 'DMs that keep you close',
    body: 'Direct messages, message requests, notifications and presence — your community in one home instead of 47 group chats.',
  },
  {
    title: 'Safe by design',
    body: 'Reporting with appeals, moderators, mutes and blocks. Safety shipped with the product, not after it.',
  },
  {
    title: 'Built for our phones',
    body: 'Installs from your browser, runs light on mid-range Androids and metered networks. English · Kiswahili · Français · العربية · Português.',
  },
]

const PERSONAS = [
  { who: 'For the hustler', line: 'Opportunities don’t DM you. Join the Circle where they’re posted.' },
  { who: 'For the creator', line: 'Your people, not their algorithm. Build your Circle, keep your crowd.' },
  { who: 'For the learner', line: 'Learn with people, not at them. Study Circles, mentors, real progress.' },
  { who: 'For the connector', line: 'One home for your whole African circle — Lagos to Nairobi to the diaspora.' },
]

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      {/* HERO */}
      <section className="welcome-hero">
        <div className="welcome-hero-inner">
          <span className="welcome-badge">Now live · Free to join</span>
          <h1 className="welcome-h1">
            Africa connects <span className="welcome-h1-accent">here.</span>
          </h1>
          <p className="welcome-sub">
            Nia is communities that build you up, not scroll you down. Join Circles —
            purpose-led communities for music, football, tech, business and culture —
            and find your people and your shot.
          </p>
          <div className="welcome-cta-row">
            <Link href="/signup" className="btn-primary welcome-cta">Join Nia free</Link>
            <Link href="/login" className="btn-ghost welcome-cta-ghost">I already have an account</Link>
          </div>
          <p className="welcome-note">
            Works on any phone · Installs from your browser · Built light for African networks
          </p>
        </div>
      </section>

      {/* CIRCLES TICKER */}
      <section aria-label="Circle interests" className="welcome-circles">
        {CIRCLES.map((c) => (
          <span key={c} className="welcome-circle-chip">{c}</span>
        ))}
      </section>

      {/* FEATURES */}
      <section className="welcome-section">
        <h2 className="welcome-h2">Not another feed. A home.</h2>
        <div className="welcome-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="card welcome-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="welcome-section">
        <h2 className="welcome-h2">Three steps to your people</h2>
        <ol className="welcome-steps">
          <li><strong>Pick your interests.</strong> Music, football, tech, business, culture — tell us what you love.</li>
          <li><strong>Join your Circles.</strong> We match you to living communities already posting, sharing and growing.</li>
          <li><strong>Add something useful.</strong> A question, a help offer, a progress update, a Flick. That’s how you grow together.</li>
        </ol>
      </section>

      {/* PERSONAS */}
      <section className="welcome-section">
        <div className="welcome-personas">
          {PERSONAS.map((p) => (
            <div key={p.who} className="welcome-persona">
              <p className="welcome-persona-who">{p.who}</p>
              <p className="welcome-persona-line">{p.line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDING CTA */}
      <section className="welcome-final">
        <h2 className="welcome-h2-light">“Nia” means intention in Swahili.</h2>
        <p className="welcome-final-sub">A social network with one. Founding members get the badge forever.</p>
        <Link href="/signup" className="btn-primary welcome-cta">Start your Circle</Link>
      </section>

      <style>{`
        .welcome-page { background: var(--surface-0); color: var(--text-primary); }
        .welcome-hero {
          background: linear-gradient(160deg, #43127E 0%, var(--nia-accent) 55%, #7C3AED 100%);
          color: #fff; padding: 72px 20px 64px; text-align: center;
        }
        .welcome-hero-inner { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; align-items: center; }
        .welcome-badge {
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.35);
        }
        .welcome-h1 { font-size: clamp(40px, 8vw, 72px); line-height: 1.02; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .welcome-h1-accent { color: #D6C7FF; }
        .welcome-sub { font-size: 17px; line-height: 1.6; margin: 0; max-width: 560px; opacity: 0.94; }
        .welcome-cta-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .welcome-cta { padding: 14px 28px; font-size: 16px; border-radius: 999px; }
        .welcome-cta-ghost {
          background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.5);
          padding: 14px 28px; font-size: 16px; border-radius: 999px;
        }
        .welcome-cta-ghost:hover { background: rgba(255,255,255,0.12); border-color: #fff; }
        .welcome-note { font-size: 13px; margin: 0; opacity: 0.8; }
        .welcome-circles {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
          max-width: 720px; margin: -26px auto 0; padding: 0 16px; position: relative;
        }
        .welcome-circle-chip {
          background: var(--surface-1); border: 1px solid var(--divider); border-radius: 999px;
          padding: 6px 14px; font-size: 13px; font-weight: 600; color: var(--text-secondary);
        }
        .welcome-section { max-width: 960px; margin: 0 auto; padding: 56px 20px 8px; }
        .welcome-h2 { font-size: clamp(26px, 5vw, 40px); font-weight: 800; letter-spacing: -0.01em; margin: 0 0 24px; text-align: center; }
        .welcome-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .welcome-card { padding: 20px; }
        .welcome-card h3 { margin: 0 0 8px; font-size: 17px; color: var(--nia-accent); }
        .welcome-card p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
        .welcome-steps {
          max-width: 620px; margin: 0 auto; padding-left: 22px; display: flex; flex-direction: column; gap: 14px;
          font-size: 15px; line-height: 1.6; color: var(--text-secondary);
        }
        .welcome-steps strong { color: var(--text-primary); }
        .welcome-personas { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .welcome-persona {
          background: var(--surface-1); border: 1px solid var(--divider); border-radius: 16px; padding: 18px;
        }
        .welcome-persona-who { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--nia-accent); margin: 0 0 6px; }
        .welcome-persona-line { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.5; }
        .welcome-final {
          margin-top: 56px; background: linear-gradient(160deg, var(--nia-accent), #7C3AED);
          color: #fff; text-align: center; padding: 64px 20px;
          display: flex; flex-direction: column; gap: 14px; align-items: center;
        }
        .welcome-h2-light { font-size: clamp(26px, 5vw, 40px); font-weight: 800; margin: 0; }
        .welcome-final-sub { margin: 0; opacity: 0.9; }
      `}</style>
    </main>
  )
}
