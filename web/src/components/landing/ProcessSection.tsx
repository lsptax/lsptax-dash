import { ClipboardList, Mail, PenLine } from "lucide-react";
import { PROCESS_CLOSING, PROCESS_STEPS } from "./content";
import { SectionHeading } from "./SectionHeading";

const STEP_ICONS = {
  contact: Mail,
  details: ClipboardList,
  signup: PenLine,
} as const;

const ProcessSection = () => {
  return (
    <section id="how" className="scroll-mt-20 bg-site-navy py-20 sm:py-24" aria-labelledby="how-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="how-title"
          tone="dark"
          eyebrow="How it works"
          title="Three steps to get started"
          intro="Submit your details and our team will walk you through signup."
        />
        <div className="relative mt-14">
          <div
            className="absolute left-[16.67%] right-[16.67%] top-6 hidden h-px bg-site-gold/40 lg:block"
            aria-hidden
          />
        <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PROCESS_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.key];
            return (
              <li key={step.title} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-site-gold font-serif text-lg font-bold text-site-navy ring-8 ring-site-navy">
                  {index + 1}
                </span>
                <div className="mt-6 w-full flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <Icon className="mx-auto h-6 w-6 text-site-gold" aria-hidden />
                  <h3 className="mt-4 font-serif text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
        </div>
        <p className="mx-auto mt-12 max-w-3xl text-center text-base leading-relaxed text-white/75 sm:text-lg">
          {PROCESS_CLOSING}
        </p>
      </div>
    </section>
  );
};

export default ProcessSection;
