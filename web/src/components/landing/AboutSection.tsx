import { CheckCircle2, MapPin } from "lucide-react";
import { ABOUT_POINTS, SITE_CONTACT } from "./content";
import { SectionHeading } from "./SectionHeading";

const AboutSection = () => {
  return (
    <section id="about" className="scroll-mt-20 bg-white py-20 sm:py-24" aria-labelledby="about-title">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionHeading
            id="about-title"
            align="left"
            eyebrow="About us"
            title="Texas property tax consulting, built on local knowledge"
          />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-site-slate">
            <p>
              Lone Star Property Tax helps property owners get a fair assessment. We review your
              appraisal, find where the value is too high and make the case to the appraisal
              district on your behalf.
            </p>
            <p>
              Our team knows Texas property tax law and how each appraisal district works. We
              handle the paperwork, the deadlines and the hearings, and you only pay if we
              reduce your value.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {ABOUT_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm font-semibold text-site-ink">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-site-gold-ink" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-site-navy p-8 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-gold">Our promise</p>
          <p className="mt-5 font-serif text-2xl font-semibold leading-snug sm:text-3xl">
            If we can't lower your property's value, you owe us nothing.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Fees are clear and agreed in writing before we start, so you always know what to
            expect.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/5 p-5">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-site-gold" aria-hidden />
            <div className="text-sm text-white/80">
              <p className="font-semibold text-white">Based in Sugar Land, serving all of Texas</p>
              <p className="mt-1">{SITE_CONTACT.addressInline}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
