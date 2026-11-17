import { Star } from "lucide-react";
import { TESTIMONIALS } from "./content";
import { SectionHeading } from "./SectionHeading";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const TestimonialsSection = () => {
  return (
    <section className="bg-white py-20 sm:py-24" aria-labelledby="testimonials-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="testimonials-title" eyebrow="Client reviews" title="What our clients say" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure
              key={item.name}
              className="flex flex-col rounded-2xl border border-site-line bg-site-cream p-6 sm:p-7"
            >
              <div className="flex gap-1 text-site-gold" role="img" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 font-serif text-lg leading-relaxed text-site-ink">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-site-navy text-sm font-bold text-white">
                  {initials(item.name)}
                </span>
                <span className="text-sm font-semibold text-site-navy">{item.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
