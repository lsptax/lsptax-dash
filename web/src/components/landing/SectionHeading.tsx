import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  tone = "light",
  id,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
  id?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-[0.2em]",
          tone === "dark" ? "text-site-gold" : "text-site-gold-ink"
        )}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          "mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl",
          tone === "dark" ? "text-white" : "text-site-navy"
        )}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            tone === "dark" ? "text-white/75" : "text-site-slate"
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
