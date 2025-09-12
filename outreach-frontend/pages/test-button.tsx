"use client";

import { useState, useEffect } from "react";
import TestStripeButton from "../components/TestStripeButton";
import BlackUploadButton from "../components/BlackUploadButton";

export default function TestButtonPage() {
  const [inputValue, setInputValue] = useState("");
  const [shineKey, setShineKey] = useState(0);

  useEffect(() => {
    if (!inputValue) return;
    const id = setTimeout(() => {
      // bump shineKey each time typing settles
      setShineKey((k) => k + 1);
    }, 800); // pause length
    return () => clearTimeout(id);
  }, [inputValue]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-8">
      <h1 className="text-2xl font-bold">Stripe-Style Button Demo</h1>

      {/* Dummy input for TestStripeButton */}
      <input
        type="text"
        placeholder="Enter dummy data"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="border rounded-lg px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
      />

      {/* Blue TestStripeButton */}
      <TestStripeButton disabled={!inputValue} shineKey={shineKey} />

      {/* BlackUploadButton */}
      <BlackUploadButton onProceed={() => {}} />
    </div>
  );
}
