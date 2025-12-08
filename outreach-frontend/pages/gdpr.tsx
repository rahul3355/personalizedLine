import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import SendItFastLogo from "../assets/senditfast-logo.png";
import Footer from "../components/Footer";

const SEO = {
  title: "GDPR Compliance | SendItFast.ai",
  description:
    "GDPR compliance information for SendItFast.ai - Learn about your data protection rights and how we comply with GDPR.",
  url: "https://senditfast.ai/gdpr",
};

export default function GDPRPage() {
  return (
    <>
      <Head>
        <title>{SEO.title}</title>
        <meta name="description" content={SEO.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SEO.url} />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <Image
                  src={SendItFastLogo}
                  alt="SendItFast.ai"
                  width={120}
                  height={28}
                  priority
                />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              GDPR Compliance
            </h1>
            <p className="text-gray-500 mb-8">Last updated: December 8, 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2>Our Commitment to GDPR</h2>
              <p>
                SendItFast.ai is committed to complying with the General Data
                Protection Regulation (GDPR). This page explains how we handle
                personal data and your rights under GDPR.
              </p>

              <h2>Your Rights Under GDPR</h2>
              <p>
                If you are in the European Economic Area (EEA), you have the
                following rights:
              </p>

              <h3>Right to Access (Article 15)</h3>
              <p>
                You have the right to request a copy of the personal data we
                hold about you. Contact us to request your data.
              </p>

              <h3>Right to Rectification (Article 16)</h3>
              <p>
                You have the right to request correction of inaccurate personal
                data. You can update most information directly in your account
                settings.
              </p>

              <h3>Right to Erasure (Article 17)</h3>
              <p>
                You have the right to request deletion of your personal data
                ("right to be forgotten"). Contact us to request deletion of
                your account and associated data.
              </p>

              <h3>Right to Restrict Processing (Article 18)</h3>
              <p>
                You have the right to request that we restrict processing of
                your personal data in certain circumstances.
              </p>

              <h3>Right to Data Portability (Article 20)</h3>
              <p>
                You have the right to receive your personal data in a
                structured, commonly used, machine-readable format.
              </p>

              <h3>Right to Object (Article 21)</h3>
              <p>
                You have the right to object to processing of your personal data
                for direct marketing purposes.
              </p>

              <h2>Legal Basis for Processing</h2>
              <p>We process personal data based on the following legal bases:</p>
              <ul>
                <li>
                  <strong>Contract:</strong> Processing necessary to provide the
                  Service you requested
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> Processing for our
                  legitimate business interests (service improvement, security)
                </li>
                <li>
                  <strong>Consent:</strong> Where you have given explicit
                  consent
                </li>
                <li>
                  <strong>Legal Obligation:</strong> Processing required by law
                </li>
              </ul>

              <h2>Data Processing Activities</h2>
              <h3>Account Data</h3>
              <p>
                We process your account information (name, email) to provide the
                Service. Legal basis: Contract.
              </p>

              <h3>Prospect Data</h3>
              <p>
                When you upload prospect data, you are the data controller. We
                act as a data processor on your behalf. Legal basis: Contract.
              </p>

              <h3>Usage Data</h3>
              <p>
                We collect usage data to improve the Service. Legal basis:
                Legitimate Interests.
              </p>

              <h2>Data Transfers</h2>
              <p>
                Your data may be processed outside the EEA. We ensure
                appropriate safeguards through:
              </p>
              <ul>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Adequacy decisions by the European Commission</li>
                <li>Data processing agreements with sub-processors</li>
              </ul>

              <h2>Sub-Processors</h2>
              <p>We use the following sub-processors:</p>
              <table>
                <thead>
                  <tr>
                    <th>Sub-Processor</th>
                    <th>Purpose</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Supabase</td>
                    <td>Database and authentication</td>
                    <td>USA (EU data region available)</td>
                  </tr>
                  <tr>
                    <td>Stripe</td>
                    <td>Payment processing</td>
                    <td>USA/Ireland</td>
                  </tr>
                  <tr>
                    <td>Google Cloud</td>
                    <td>Infrastructure</td>
                    <td>Various (EU regions)</td>
                  </tr>
                </tbody>
              </table>

              <h2>Data Retention</h2>
              <p>
                We retain personal data only as long as necessary:
              </p>
              <ul>
                <li>Account data: While your account is active</li>
                <li>Uploaded files: 30 days after processing</li>
                <li>Usage logs: 90 days</li>
                <li>Financial records: 7 years (legal requirement)</li>
              </ul>

              <h2>Data Protection Officer</h2>
              <p>
                For GDPR-related inquiries, contact our Data Protection Officer:
              </p>
              <p>
                Email:{" "}
                <a href="mailto:dpo@senditfast.ai">dpo@senditfast.ai</a>
              </p>

              <h2>Supervisory Authority</h2>
              <p>
                If you believe we have not adequately addressed your concerns,
                you have the right to lodge a complaint with your local data
                protection authority.
              </p>

              <h2>Exercising Your Rights</h2>
              <p>To exercise any of your rights, contact us at:</p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:privacy@senditfast.ai">
                    privacy@senditfast.ai
                  </a>
                </li>
              </ul>
              <p>
                We will respond to your request within 30 days. In some cases,
                we may need to verify your identity before processing your
                request.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

GDPRPage.disableWhiteCard = true;
GDPRPage.backgroundClassName = "bg-white";
