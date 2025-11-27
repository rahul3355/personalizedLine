import shipImage from "../../assets/ship.png";
import { Button } from "@/components/ui/button";
import { PiCoinDuotone, PiCoinsDuotone } from "react-icons/pi";
import { useAuth } from "../../lib/AuthProvider";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast/useToast";

export default function OfferCard() {
    const { session } = useAuth();
    const { toast } = useToast();
    const [status, setStatus] = useState<"locked" | "unlocked" | "claimed">("locked");
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        if (!session?.access_token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.welcome_reward_status || "locked");
                setCreatedAt(data.created_at);
            }
        } catch (error) {
            console.error("Failed to fetch reward status", error);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [session]);

    const handleClaim = async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/claim-welcome-reward`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (res.ok) {
                toast({ type: 'success', message: "500 Credits Claimed!" });
                setStatus("claimed");
                window.location.reload();
            } else {
                const err = await res.json();
                toast({ type: 'error', message: err.detail || "Failed to claim reward" });
            }
        } catch (error) {
            toast({ type: 'error', message: "Something went wrong" });
        } finally {
            setLoading(false);
        }
    };

    if (status === "claimed") {
        return null;
    }

    // Calculate expiration date
    let expirationText = "";
    if (createdAt && status === "locked") {
        const createdDate = new Date(createdAt);
        const expirationDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Format: "Nov 24, 2:30 PM"
        const formattedDate = expirationDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        expirationText = ` by ${formattedDate}`;
    }

    return (
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 w-full max-w-sm mx-auto">
            {/* Photo Container */}
            <div className="bg-gray-100 mb-4 rounded-lg overflow-hidden">
                <img
                    src={shipImage.src}
                    alt="Ship illustration"
                    className="w-full h-auto aspect-square object-cover"
                />
            </div>

            {/* Caption Area */}
            <div className="flex flex-col gap-4">
                <div className="text-left">
                    <h2 className="text-xl font-medium text-black" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                        {status === "unlocked" ? "Reward Unlocked!" : "Exploring?"}
                    </h2>
                    <p className="text-md font-medium text-gray-500" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                        {status === "unlocked"
                            ? "Claim your 500 free credits now."
                            : `Spend 500 credits${expirationText} to unlock 500 free credits!`}
                    </p>
                </div>

                <Button
                    onClick={handleClaim}
                    disabled={status === "locked" || loading}
                    className={`w-full font-medium rounded-lg h-10 shadow-grey flex items-center justify-center gap-2 transition-all
                        ${status === "unlocked"
                            ? "bg-black text-white hover:bg-gray-800"
                            : "bg-white text-gray-400 border border-gray-200 cursor-not-allowed"}`}
                    style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}
                >
                    {loading ? (
                        "Claiming..."
                    ) : (
                        <>
                            <PiCoinsDuotone className={`w-4 h-4 ${status === "unlocked" ? "text-[#FFD700]" : "text-gray-400"}`} />
                            {status === "unlocked" ? "Claim 500 Credits" : "Locked"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
