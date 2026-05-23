import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/Seo";

export default function TermsOfUsePage() {
  return (
    <>
      <Seo
        title="Terms of Use | Lone Star Property Tax"
        description="Review Lone Star Property Tax’s Terms of Use, including acceptance of terms, services description, user responsibilities, disclaimers, limitation of liability, and governing law (Texas)."
      />
      <Header />
      <main id="main" className="min-h-[70vh] bg-white">
        <div className="container mx-auto px-4 py-12">
          <header className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-dark">
              Terms of Use
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective date: March 26, 2026
            </p>
            <p className="mt-6 text-base text-muted-foreground">
              These Terms of Use (“Terms”) govern your access to and use of the
              Lone Star Property Tax website and services. By accessing or using
              the site, you agree to these Terms.
            </p>
          </header>

          <div className="mt-10 max-w-3xl space-y-10">
            <section aria-labelledby="terms-acceptance">
              <h2
                id="terms-acceptance"
                className="text-xl font-semibold text-brand-dark"
              >
                Acceptance of terms
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                By accessing, browsing, or using our website or services, you
                acknowledge that you have read, understood, and agree to be
                bound by these Terms and our Privacy Policy.
              </p>
            </section>

            <section aria-labelledby="terms-services">
              <h2
                id="terms-services"
                className="text-xl font-semibold text-brand-dark"
              >
                Services description
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Lone Star Property Tax provides property tax consulting and
                related services, which may include guidance, preparation of
                documentation, and assistance with submissions and
                communications. Services may vary by location, property type,
                and applicable deadlines.
              </p>
            </section>

            <section aria-labelledby="terms-responsibilities">
              <h2
                id="terms-responsibilities"
                className="text-xl font-semibold text-brand-dark"
              >
                User responsibilities
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Provide accurate, complete, and current information when
                    submitting requests or using our services.
                  </li>
                  <li>
                    Use the website in a lawful manner and not attempt to
                    disrupt, degrade, or compromise site security or
                    availability.
                  </li>
                  <li>
                    Maintain the confidentiality of any account credentials and
                    notify us promptly of suspected unauthorized access.
                  </li>
                </ul>
              </div>
            </section>

            <section aria-labelledby="terms-disclaimers">
              <h2
                id="terms-disclaimers"
                className="text-xl font-semibold text-brand-dark"
              >
                Disclaimers and limitation of liability
              </h2>
              <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  The website and services are provided on an “as is” and “as
                  available” basis. To the fullest extent permitted by law, we
                  disclaim all warranties of any kind, whether express or
                  implied, including implied warranties of merchantability,
                  fitness for a particular purpose, and non-infringement.
                </p>
                <p>
                  To the fullest extent permitted by law, Lone Star Property Tax
                  will not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, or any loss of profits,
                  revenue, data, or goodwill, arising from or related to your
                  use of the website or services.
                </p>
              </div>
            </section>

            <section aria-labelledby="terms-law">
              <h2
                id="terms-law"
                className="text-xl font-semibold text-brand-dark"
              >
                Governing law (Texas)
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the State of Texas,
                without regard to conflict of laws principles.
              </p>
            </section>

            <section aria-labelledby="terms-contact">
              <h2
                id="terms-contact"
                className="text-xl font-semibold text-brand-dark"
              >
                Contact
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Questions about these Terms can be sent to{" "}
                <a
                  className="text-brand-primary hover:underline"
                  href="mailto:info@lsptax.com"
                >
                  info@lsptax.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}

