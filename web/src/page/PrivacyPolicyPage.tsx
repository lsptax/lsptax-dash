import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/Seo";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Seo
        title="Privacy Policy | Lone Star Property Tax"
        description="Read Lone Star Property Tax’s Privacy Policy, including what data we collect, how we use it, sharing, cookies/analytics, retention, and how to contact us."
      />
      <Header />
      <main id="main" className="min-h-[70vh] bg-white">
        <div className="container mx-auto px-4 py-12">
          <header className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-dark">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective date: March 26, 2026
            </p>
            <p className="mt-6 text-base text-muted-foreground">
              This Privacy Policy explains how Lone Star Property Tax (“Lone
              Star Property Tax,” “we,” “us,” or “our”) collects, uses, shares,
              and protects information when you visit our website or use our
              services.
            </p>
          </header>

          <div className="mt-10 max-w-3xl space-y-10">
            <section aria-labelledby="privacy-what-we-collect">
              <h2
                id="privacy-what-we-collect"
                className="text-xl font-semibold text-brand-dark"
              >
                What data we collect
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>We may collect the following categories of information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <span className="font-medium text-foreground">
                      Contact information
                    </span>{" "}
                    such as your name, email address, phone number, and mailing
                    address.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Property information
                    </span>{" "}
                    such as property address, account/parcel identifiers,
                    assessed value information, taxing jurisdiction details, and
                    other details you provide to evaluate or manage a property
                    tax protest or related services.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Usage analytics
                    </span>{" "}
                    such as pages viewed, approximate location, device/browser
                    information, and interactions with our site (typically
                    collected via cookies or similar technologies).
                  </li>
                </ul>
              </div>
            </section>

            <section aria-labelledby="privacy-how-we-use">
              <h2
                id="privacy-how-we-use"
                className="text-xl font-semibold text-brand-dark"
              >
                How we use data
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>We use information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Deliver and administer services you request, including
                    property tax consulting, filings, communications, and
                    related support.
                  </li>
                  <li>
                    Provide customer support, respond to inquiries, and send
                    service-related messages.
                  </li>
                  <li>
                    Maintain compliance with legal, regulatory, and contractual
                    obligations.
                  </li>
                  <li>
                    Improve our website, offerings, and user experience,
                    including through analytics.
                  </li>
                </ul>
              </div>
            </section>

            <section aria-labelledby="privacy-sharing">
              <h2
                id="privacy-sharing"
                className="text-xl font-semibold text-brand-dark"
              >
                Sharing
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>We may share information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <span className="font-medium text-foreground">
                      With service providers
                    </span>{" "}
                    who help us operate our business (for example, hosting,
                    analytics, communications, and document tools), subject to
                    appropriate protections.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      For legal reasons
                    </span>{" "}
                    when required by law, regulation, legal process, or
                    governmental request, or to protect rights, safety, and
                    property.
                  </li>
                </ul>
              </div>
            </section>

            <section aria-labelledby="privacy-security">
              <h2
                id="privacy-security"
                className="text-xl font-semibold text-brand-dark"
              >
                Security
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We use reasonable administrative, technical, and physical
                safeguards designed to protect information. No method of
                transmission or storage is completely secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section aria-labelledby="privacy-retention">
              <h2
                id="privacy-retention"
                className="text-xl font-semibold text-brand-dark"
              >
                Retention
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We retain information for as long as needed to provide services,
                comply with legal obligations, resolve disputes, and enforce our
                agreements. Retention periods may vary based on the type of data
                and the purposes for which it is processed.
              </p>
            </section>

            <section aria-labelledby="privacy-rights">
              <h2
                id="privacy-rights"
                className="text-xl font-semibold text-brand-dark"
              >
                User rights and how to contact us
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Depending on your location, you may have rights to request
                  access, correction, or deletion of certain information. To
                  make a request or ask questions about this Privacy Policy,
                  contact us at{" "}
                  <a
                    className="text-brand-primary hover:underline"
                    href="mailto:info@lsptax.com"
                  >
                    info@lsptax.com
                  </a>
                  .
                </p>
              </div>
            </section>

            <section aria-labelledby="privacy-cookies">
              <h2
                id="privacy-cookies"
                className="text-xl font-semibold text-brand-dark"
              >
                Cookies and analytics
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We may use cookies and similar technologies to operate our
                website and understand usage (for example, analytics). You can
                control cookies through your browser settings; blocking some
                cookies may impact site functionality.
              </p>
            </section>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}

