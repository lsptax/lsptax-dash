import { Link } from "react-router-dom";
import { ArrowRight, Check, FileText, Gavel, MailCheck, Search } from "lucide-react";
import { SITE_STATS } from "./content";

const HERO_CHECKS = ["No savings, no fee", "Experienced team", "Personal service"];

const PROTEST_TRACK = [
  { icon: FileText, label: "Appraisal notice reviewed", detail: "Value checked against the market" },
  { icon: Search, label: "Evidence prepared", detail: "Comparable sales and property data" },
  { icon: Gavel, label: "Protest represented", detail: "Informal review and ARB hearing" },
  { icon: MailCheck, label: "Result shared with you", detail: "You pay only if we save you money" },
];

/** Five-point star outline used as a quiet background motif. */
function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M50 4 61.8 37.6H97.6L68.6 58.4 79.4 92 50 71.2 20.6 92 31.4 58.4 2.4 37.6H38.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

const HeroSection = () => {
  return (
    <section id="top" className="relative overflow-hidden bg-site-navy" aria-labelledby="hero-title">
      <StarMark className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] text-white/[0.06]" />
      <StarMark className="pointer-events-none absolute -bottom-40 -left-32 h-[380px] w-[380px] text-site-gold/[0.08]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-site-gold">
            Texas property tax consultants
          </p>
          <h1
            id="hero-title"
            className="mt-6 font-serif text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl"
          >
            Property tax expertise.
            <span className="block text-site-gold">Real representation.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            We protest your property value with the appraisal district so you pay a fair share, for
            residential, commercial and business property owners across Texas.
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {HERO_CHECKS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Check className="h-4 w-4 text-site-gold" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/#contact"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-site-gold px-7 text-sm font-bold text-site-navy transition-colors hover:bg-site-gold-hover"
            >
              Get started today
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              to="/#how"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-site-line pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-site-gold-ink">
                  Your protest
                </p>
                <p className="mt-1 font-serif text-xl font-semibold text-site-navy">
                  Handled start to finish
                </p>
              </div>
              <span className="rounded-full bg-site-cream px-3 py-1 text-xs font-semibold text-site-navy">
                Every tax year
              </span>
            </div>
            <ol className="mt-5 space-y-4">
              {PROTEST_TRACK.map(({ icon: Icon, label, detail }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-site-cream text-site-navy">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-site-ink">{label}</p>
                    <p className="text-sm text-site-slate">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-site-navy-2/60">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {SITE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse text-center lg:border-l lg:border-white/10 lg:first:border-l-0"
            >
              <dt className="mt-1 text-sm text-white/70">{stat.label}</dt>
              <dd className="font-serif text-3xl font-semibold text-white">{stat.figure}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default HeroSection;
