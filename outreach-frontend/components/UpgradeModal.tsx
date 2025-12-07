import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// ============================================================================
// UPGRADE CONFIRMATION MODAL - Perplexity-style clean design
// ============================================================================
interface UpgradeConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    currentPlan: string;
    newPlan: string;
    currentCredits: number;
    newCredits: number;
    bonusCredits?: number;
    price: number;
    billingCycle: "monthly" | "annual";
}

export function UpgradeConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    currentPlan,
    newPlan,
    currentCredits,
    newCredits,
    bonusCredits = 0,
    price,
    billingCycle,
}: UpgradeConfirmModalProps) {
    const isAnnual = billingCycle === "annual";
    const totalCredits = newCredits + bonusCredits;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
                            {/* Header */}
                            <div className="relative px-6 pt-6 pb-4">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="absolute right-4 top-4 p-2 rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-5 h-5 text-neutral-500" />
                                </button>

                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-neutral-900">
                                        Upgrade to {newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}
                                    </h2>
                                </div>
                                <p className="text-neutral-500 text-sm">
                                    {isAnnual ? "Annual billing - Save 20%" : "Monthly billing"}
                                </p>
                            </div>

                            {/* Plan Comparison */}
                            <div className="px-6 pb-4">
                                <div className="bg-neutral-50 rounded-xl p-4 space-y-4">
                                    {/* From → To */}
                                    <div className="flex items-center justify-between">
                                        <div className="text-center flex-1">
                                            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Current</p>
                                            <p className="font-medium text-neutral-700 capitalize">{currentPlan}</p>
                                            <p className="text-sm text-neutral-500">{currentCredits.toLocaleString()} credits</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-neutral-400 mx-4" />
                                        <div className="text-center flex-1">
                                            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">New Plan</p>
                                            <p className="font-semibold text-neutral-900 capitalize">{newPlan}</p>
                                            <p className="text-sm text-green-600 font-medium">
                                                {newCredits.toLocaleString()} credits{isAnnual ? "/yr" : "/mo"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-neutral-200" />

                                    {/* Credit Summary */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-600">New plan credits</span>
                                            <span className="font-medium">{newCredits.toLocaleString()}</span>
                                        </div>
                                        {bonusCredits > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-600">+ Bonus (unused time)</span>
                                                <span className="font-medium text-green-600">+{bonusCredits.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-semibold pt-2 border-t border-neutral-200">
                                            <span className="text-neutral-900">Total credits</span>
                                            <span className="text-neutral-900">{totalCredits.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price & Action */}
                            <div className="px-6 pb-6 space-y-4">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-neutral-600">Amount to charge</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-bold text-neutral-900">${price.toLocaleString()}</span>
                                        <span className="text-neutral-500 text-sm ml-1">
                                            {isAnnual ? "/year" : "/month"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="w-4 h-4" />
                                                Confirm Upgrade
                                            </>
                                        )}
                                    </button>
                                </div>

                                <p className="text-xs text-neutral-400 text-center">
                                    Your card will be charged immediately. Credits are added instantly.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================================================
// RESULT MODAL - For success/error messages
// ============================================================================
interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "success" | "error";
    title: string;
    message: string;
    details?: {
        plan?: string;
        credits?: number;
        amountCharged?: number;
    };
}

export function ResultModal({
    isOpen,
    onClose,
    type,
    title,
    message,
    details,
}: ResultModalProps) {
    const isSuccess = type === "success";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
                            {/* Icon */}
                            <div className="pt-8 pb-4 flex justify-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.1, duration: 0.5 }}
                                    className={`p-4 rounded-full ${isSuccess
                                            ? "bg-green-100"
                                            : "bg-red-100"
                                        }`}
                                >
                                    {isSuccess ? (
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-10 h-10 text-red-600" />
                                    )}
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="px-6 pb-2 text-center">
                                <h2 className={`text-xl font-semibold mb-2 ${isSuccess ? "text-neutral-900" : "text-red-900"
                                    }`}>
                                    {title}
                                </h2>
                                <p className="text-neutral-600 text-sm">
                                    {message}
                                </p>
                            </div>

                            {/* Success Details */}
                            {isSuccess && details && (
                                <div className="px-6 py-4">
                                    <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                                        {details.plan && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">New Plan</span>
                                                <span className="font-medium capitalize">{details.plan}</span>
                                            </div>
                                        )}
                                        {details.credits !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Credits Added</span>
                                                <span className="font-medium text-green-600">+{details.credits.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {details.amountCharged !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Amount Charged</span>
                                                <span className="font-medium">${details.amountCharged.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action */}
                            <div className="px-6 pb-6">
                                <button
                                    onClick={onClose}
                                    className={`w-full px-4 py-3 rounded-xl font-medium transition-colors ${isSuccess
                                            ? "bg-green-600 text-white hover:bg-green-700"
                                            : "bg-neutral-900 text-white hover:bg-neutral-800"
                                        }`}
                                >
                                    {isSuccess ? "Continue" : "Try Again"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
