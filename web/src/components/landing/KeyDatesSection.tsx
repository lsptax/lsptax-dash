import { CalendarDays } from "lucide-react";
import { KEY_DATES } from "./content";
import { SectionHeading } from "./SectionHeading";

const KeyDatesSection = () => {
  return (
    <section id="keydates" className="scroll-mt-20 bg-site-cream py-20 sm:py-24" aria-labelledby="keydates-title">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="keydates-title"
            align="left"
            eyebrow="Key dates"
            title="The Texas property tax calendar"
            intro="Missing a deadline can cost you a year of savings. These are the dates that matter, and we track them for every client."
          />
        </div>
        <ol className="relative space-y-4 border-l-2 border-site-line pl-6 sm:pl-8">
          {KEY_DATES.map((item) => (
            <li key={item.date} className="relative">
              <span
                className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-site-cream bg-site-gold sm:-left-[41px]"
                aria-hidden
              />
              <div className="rounded-2xl border border-site-line bg-white p-5 sm:p-6">
                <p className="flex items-center gap-2 font-serif text-lg font-semibold text-site-navy">
                  <CalendarDays className="h-5 w-5 text-site-gold-ink" aria-hidden />
                  {item.date}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-site-slate">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default KeyDatesSection;
