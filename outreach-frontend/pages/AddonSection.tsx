import { useState } from "react";

export default function AddonSection({
  planType,
  session,
  apiUrl,
}: {
  planType: string;
  session: any;
  apiUrl: string;
}) {
  const prices: Record<string, number> = {
    free: 10,
    starter: 8,
    growth: 6,
    pro: 5,
  };

  const [quantity, setQuantity] = useState(1);
  const unitPrice = prices[planType] || 10;
  const totalPrice = unitPrice * quantity;

  const handleBuy = async () => {
    if (!session) return;

    try {
      const res = await fetch(`${apiUrl}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          is_addon: "true",
          quantity: quantity.toString(),
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to create checkout session:", data);
        alert("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Checkout error", err);
      alert("Something went wrong while starting checkout");
    }
  };

  return (
    <div className="mt-16 max-w-2xl mx-auto bg-white rounded-3xl shadow-md border border-gray-100 p-10 text-center">
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
        Add-on Pricing
      </h2>
      <p className="text-sm text-gray-500 mb-8">
        For{" "}
        <span className="font-medium text-gray-800">
          {planType.charAt(0).toUpperCase() + planType.slice(1)} Plan
        </span>
        — ${unitPrice} per 1000 lines
      </p>

      {/* Selector */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <label
          htmlFor="addon-select"
          className="text-sm font-medium text-gray-700"
        >
          Select additional packs
        </label>
        <select
          id="addon-select"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="appearance-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-black focus:outline-none transition w-40 text-center"
        >
          {[...Array(20)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} × 1000 lines
            </option>
          ))}
        </select>
      </div>

      {/* Total */}
      <p className="text-lg font-semibold text-gray-900 mb-8">
        Total: ${totalPrice}
      </p>

      {/* Buy button */}
      <button
        onClick={handleBuy}
        className="w-full rounded-xl bg-gradient-to-b from-gray-800 to-black text-white text-base font-medium py-3 shadow-md hover:shadow-lg transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
      >
        Buy Add-ons
      </button>
    </div>
  );
}
