import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

import SendItFastLogo from "../assets/senditfast-logo.png";
import { supabase } from "../lib/supabaseClient";

export default function LandingNavbar() {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const isActive = (path: string) => router.pathname === path;

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                },
            });
        } catch (error) {
            setLoading(false);
        }
    };

    const navLinks = [
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "Blog", href: "/blog" },
        { name: "About", href: "/about" },
    ];

    return (
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

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${isActive(link.href)
                                        ? "text-gray-900 font-semibold"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-[#FFFFF0]"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center space-x-1">
                        <Link
                            href="/login"
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#FFFFF0] transition-colors"
                        >
                            Log in
                        </Link>
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
                            style={{
                                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                                fontFamily:
                                    '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                            }}
                        >
                            {loading ? (
                                "Signing in..."
                            ) : (
                                <>
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-t border-gray-100"
                    >
                        <div className="px-4 py-4 space-y-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`block py-2 font-medium ${isActive(link.href) ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-3 border-t border-gray-100">
                                <Link
                                    href="/login"
                                    className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Log in
                                </Link>
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-white"
                                    style={{
                                        background: "linear-gradient(#5a5a5a, #1c1c1c)",
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                >
                                    Get Started Free
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
