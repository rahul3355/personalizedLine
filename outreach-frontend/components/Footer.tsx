import Link from "next/link";
import Image from "next/image";
import SendItFastLogo from "../assets/senditfast-logo.png";

// Footer navigation structure - similar to Cursor's footer
const footerNavigation = {
  product: {
    title: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Pricing", href: "/pricing" },
      { name: "How It Works", href: "/features#how-it-works" },
      { name: "API", href: "/api-docs", comingSoon: true },
      { name: "Integrations", href: "/integrations", comingSoon: true },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Documentation", href: "/docs", comingSoon: true },
      { name: "Blog", href: "/blog", comingSoon: true },
      { name: "Changelog", href: "/changelog", comingSoon: true },
      { name: "Help Center", href: "/help", comingSoon: true },
      { name: "Status", href: "https://status.senditfast.ai", external: true },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Careers", href: "/careers", comingSoon: true },
      { name: "Contact", href: "/contact", comingSoon: true },
      { name: "Press Kit", href: "/press", comingSoon: true },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "GDPR", href: "/gdpr" },
    ],
  },
};

const socialLinks = [
  {
    name: "X (Twitter)",
    href: "https://twitter.com/senditfast",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Logo and description */}
            <div className="col-span-2">
              <Link href="/" className="inline-block">
                <Image
                  src={SendItFastLogo}
                  alt="SendItFast.ai - AI Email Personalization"
                  width={120}
                  height={28}
                />
              </Link>
              <p className="mt-4 text-sm text-gray-500 max-w-xs">
                AI-powered personalized cold emails at scale. Research, write,
                and convert faster than ever.
              </p>
              {/* Social links */}
              <div className="mt-6 flex space-x-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                {footerNavigation.product.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.product.links.map((link) => (
                  <li key={link.name}>
                    {link.comingSoon ? (
                      <span className="text-sm text-gray-400 cursor-default">
                        {link.name}
                        <span className="ml-1 text-xs text-gray-300">
                          (soon)
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                {footerNavigation.resources.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.resources.links.map((link) => (
                  <li key={link.name}>
                    {link.comingSoon ? (
                      <span className="text-sm text-gray-400 cursor-default">
                        {link.name}
                        <span className="ml-1 text-xs text-gray-300">
                          (soon)
                        </span>
                      </span>
                    ) : link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                {footerNavigation.company.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.company.links.map((link) => (
                  <li key={link.name}>
                    {link.comingSoon ? (
                      <span className="text-sm text-gray-400 cursor-default">
                        {link.name}
                        <span className="ml-1 text-xs text-gray-300">
                          (soon)
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                {footerNavigation.legal.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.legal.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; {currentYear} SendItFast.ai. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href="/terms"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
