import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_CONTACT } from "./content";

/** Phone, email and mailing address, shared by the footer and the contact section. */
export function ContactLinks({
  className,
  linkClassName,
  iconClassName,
  addressLabel,
}: {
  className?: string;
  linkClassName?: string;
  iconClassName?: string;
  /** When set, the address is shown on separate lines under this label. */
  addressLabel?: string;
}) {
  const icon = cn("h-4 w-4 shrink-0", iconClassName);
  return (
    <ul className={className}>
      <li>
        <a href={SITE_CONTACT.phoneHref} className={cn("flex items-center gap-3", linkClassName)}>
          <Phone className={icon} aria-hidden />
          {SITE_CONTACT.phone}
        </a>
      </li>
      <li>
        <a href={`mailto:${SITE_CONTACT.email}`} className={cn("flex items-center gap-3", linkClassName)}>
          <Mail className={icon} aria-hidden />
          {SITE_CONTACT.email}
        </a>
      </li>
      <li className="flex items-start gap-3">
        <MapPin className={cn(icon, "mt-0.5")} aria-hidden />
        {addressLabel ? (
          <span>
            {addressLabel}
            {SITE_CONTACT.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        ) : (
          <span>{SITE_CONTACT.addressInline}</span>
        )}
      </li>
      <li className="flex items-start gap-3">
        <Clock className={cn(icon, "mt-0.5")} aria-hidden />
        <span>{SITE_CONTACT.hours}</span>
      </li>
    </ul>
  );
}
