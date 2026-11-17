import { Building2, Handshake, Headset, ShieldCheck } from "lucide-react";
import { WHY_POINTS } from "./content";
import { SectionHeading } from "./SectionHeading";

const WHY_ICONS = {
  experience: ShieldCheck,
  fee: Handshake,
  types: Building2,
  support: Headset,
} as const;

const WhySection = () => {
  return (
    <section id="why" className="scroll-mt-20 bg-site-cream py-20 sm:py-24" aria-labelledby="why-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="why-title"
          eyebrow="Why Lone Star Property Tax"
          title="A protest team that works for you, not the appraisal district"
          intro="Most property owners never protest because the process is confusing and time-consuming. We take it off your plate."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_POINTS.map((point) => {
            const Icon = WHY_ICONS[point.key];
            return (
              <div
                key={point.key}
                className="rounded-2xl border border-site-line bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-site-navy/5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-site-navy text-site-gold">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-site-navy">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-site-slate">{point.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
