import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import { motion } from "framer-motion";
import SendItFastSpinner from "../components/SendItFastSpinner";
import { Save, RotateCcw } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ServiceComponents {
    core_offer: string;
    key_differentiator: string;
    cta: string;
}

const INITIAL_SERVICE_COMPONENTS: ServiceComponents = {
    core_offer: "",
    key_differentiator: "",
    cta: "",
};

export default function UserSettingsPage() {
    const { session, userInfo, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState<ServiceComponents>(INITIAL_SERVICE_COMPONENTS);
    const [initialData, setInitialData] = useState<ServiceComponents>(INITIAL_SERVICE_COMPONENTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!authLoading && !session) {
            router.push("/login");
            return;
        }

        if (userInfo) {
            // Parse service_context from profile
            let context = INITIAL_SERVICE_COMPONENTS;
            if (userInfo.service_context) {
                try {
                    if (typeof userInfo.service_context === 'string') {
                        // Handle double-stringified JSON if it happens
                        const parsed = JSON.parse(userInfo.service_context);
                        context = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
                    } else if (typeof userInfo.service_context === 'object') {
                        context = userInfo.service_context as ServiceComponents;
                    }
                } catch (e) {
                    console.error("Error parsing service_context:", e);
                }
            }

            // Ensure all fields exist
            const safeContext = {
                core_offer: context.core_offer || "",
                key_differentiator: context.key_differentiator || "",
                cta: context.cta || ""
            };

            setFormData(safeContext);
            setInitialData(safeContext);
            setLoading(false);
        }
    }, [session, userInfo, authLoading, router]);

    useEffect(() => {
        const isChanged =
            formData.core_offer !== initialData.core_offer ||
            formData.key_differentiator !== initialData.key_differentiator ||
            formData.cta !== initialData.cta;
        setHasChanges(isChanged);
    }, [formData, initialData]);

    const handleChange = (field: keyof ServiceComponents, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDiscard = () => {
        setFormData(initialData);
        toast({
            message: "Changes discarded: Your settings have been reset.",
            type: "info"
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/user/settings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    service_context: formData
                }),
            });

            if (!res.ok) throw new Error("Failed to save settings");

            setInitialData(formData);
            setHasChanges(false);
            toast({
                message: "Settings saved successfully.",
                type: "success"
            });
        } catch (err) {
            console.error("Failed to save settings:", err);
            toast({
                message: "Error: Failed to save settings. Please try again.",
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <SendItFastSpinner size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
            <div className="max-w-2xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-medium tracking-tight text-gray-900 mb-2">
                        Settings
                    </h1>
                    <p className="text-sm text-gray-500 font-light">
                        Manage your default service context for file generation.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-5">

                    {/* Core Offer */}
                    <div className="space-y-2">
                        <label htmlFor="core_offer" className="block text-xs font-semibold text-gray-900 uppercase tracking-wide">
                            Core Offer
                        </label>
                        <div className="relative">
                            <textarea
                                id="core_offer"
                                rows={2}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black transition-all resize-none"
                                placeholder="e.g. AI-powered email automation for sales teams"
                                value={formData.core_offer}
                                onChange={(e) => handleChange("core_offer", e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-500 font-light">
                            The main product or service you're offering to prospects.
                        </p>
                    </div>

                    {/* Key Differentiator */}
                    <div className="space-y-2">
                        <label htmlFor="key_differentiator" className="block text-xs font-semibold text-gray-900 uppercase tracking-wide">
                            Key Differentiator
                        </label>
                        <div className="relative">
                            <textarea
                                id="key_differentiator"
                                rows={2}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black transition-all resize-none"
                                placeholder="e.g. Generates personalized lines 10x faster than manual research"
                                value={formData.key_differentiator}
                                onChange={(e) => handleChange("key_differentiator", e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-500 font-light">
                            What makes your service unique or better than competitors.
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="space-y-2">
                        <label htmlFor="cta" className="block text-xs font-semibold text-gray-900 uppercase tracking-wide">
                            Call to Action (CTA)
                        </label>
                        <div className="relative">
                            <textarea
                                id="cta"
                                rows={2}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-black transition-all resize-none"
                                placeholder="e.g. Book a 15-minute demo to see it in action"
                                value={formData.cta}
                                onChange={(e) => handleChange("cta", e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-500 font-light">
                            The specific action you want prospects to take next.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                        {hasChanges && (
                            <button
                                onClick={handleDiscard}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Discard
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="flex items-center gap-2 px-5 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                        >
                            {saving ? (
                                <SendItFastSpinner size={14} className="text-white" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
