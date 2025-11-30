import { useState, useEffect } from "react";
import { fireConfetti } from "@/components/magicui/confetti";
import SendItFastSpinner from "../../components/SendItFastSpinner";
import { useRouter } from "next/router";

const AEONIK_FONT_FAMILY =
    '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

export default function BillingSuccessDemoPage() {
    const router = useRouter();
    const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

    // Trigger confetti when entering success state
    useEffect(() => {
        if (state === 'success') {
            fireConfetti({
                particleCount: 50,
                angle: 90,
                spread: 45,
                startVelocity: 45,
                decay: 0.9,
                gravity: 1,
                drift: 0,
                flat: false,
                ticks: 200,
                origin: { x: 0.5, y: 0.5 },
                colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
                shapes: ['square', 'circle'],
                zIndex: 100,
                disableForReducedMotion: false,
                useWorker: true,
                resize: true,
                canvas: null,
                scalar: 1,
            });
        }
    }, [state]);

    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center bg-white"
            style={{ fontFamily: AEONIK_FONT_FAMILY }}
        >
            {/* Controls for Demo */}
            <div className="fixed top-24 right-4 flex gap-2 bg-gray-100 p-2 rounded-lg z-[100] border border-gray-200 shadow-lg">
                <button
                    onClick={() => setState('loading')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${state === 'loading' ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    Loading
                </button>
                <button
                    onClick={() => setState('success')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${state === 'success' ? 'bg-white shadow text-green-600 font-medium' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    Success
                </button>
                <button
                    onClick={() => setState('error')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${state === 'error' ? 'bg-white shadow text-red-600 font-medium' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    Error
                </button>
            </div>

            <div className="w-full max-w-md p-8 text-center">
                {state === 'loading' && (
                    <div className="flex flex-col items-center space-y-8 animate-in fade-in duration-700">
                        <SendItFastSpinner size={48} />
                        <div className="space-y-2">
                            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
                                Processing payment
                            </h1>
                            <p className="text-gray-500 text-lg">
                                Please wait while we confirm your transaction...
                            </p>
                        </div>
                    </div>
                )}

                {state === 'success' && (
                    <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="rounded-full bg-green-50 p-4 ring-1 ring-green-100">
                            <svg
                                className="h-12 w-12 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                                Payment successful
                            </h1>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                Your credits have been added to your account.
                            </p>
                        </div>

                        <div className="w-full pt-4 space-y-4">
                            <button
                                onClick={() => router.push("/")}
                                className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-base font-medium text-white shadow-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
                            >
                                Continue to Dashboard
                            </button>
                            <p className="text-sm text-gray-400">
                                Redirecting automatically in a few seconds...
                            </p>
                        </div>
                    </div>
                )}

                {state === 'error' && (
                    <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
                        <div className="rounded-full bg-red-50 p-4 ring-1 ring-red-100">
                            <svg
                                className="h-10 w-10 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
                                Something went wrong
                            </h1>
                            <p className="text-gray-500">
                                We couldn't verify your payment. Please contact support.
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/")}
                            className="mt-4 rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
                        >
                            Return Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

BillingSuccessDemoPage.disableWhiteCard = true;
