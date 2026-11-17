import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, Home, Warehouse } from "lucide-react";
import { SERVICES } from "./content";
import { SectionHeading } from "./SectionHeading";

const SERVICE_ICONS = {
  residential: Home,
  commercial: Building2,
  bpp: Warehouse,
} as const;

const ServicesSection = () => {
  return (
    <section id="services" className="scroll-mt-20 bg-white py-20 sm:py-24" aria-labelledby="services-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="services-title"
          eyebrow="Our services"
          title="Representation for every kind of Texas property"
          intro="Whether you own one home or a portfolio of commercial buildings, we protest each property on its own merits."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = SERVICE_ICONS[service.key];
            return (
              <article
                key={service.key}
                className="flex flex-col overflow-hidden rounded-2xl border border-site-line bg-site-cream"
              >
                <div className="flex items-center gap-4 bg-site-navy px-6 py-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-site-gold text-site-navy">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-white">{service.title}</h3>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm leading-relaxed text-site-slate">{service.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {service.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm font-semibold text-site-ink">
                        <Check className="h-4 w-4 shrink-0 text-site-gold-ink" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/#contact"
                    className="group mt-6 inline-flex items-center gap-2 self-start text-sm font-bold text-site-navy"
                  >
                    Request a review
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
