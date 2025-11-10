
import { useState, useEffect } from "react";
import TestStripeButton from "../components/TestStripeButton";
import BlackUploadButton from "../components/BlackUploadButton";
import { useToast } from "@/components/Toast";
import { CheckCircle } from "lucide-react";

export default function TestButtonPage() {
  const [inputValue, setInputValue] = useState("");
  const [shineKey, setShineKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!inputValue) return;
    const id = setTimeout(() => {
      // bump shineKey each time typing settles
      setShineKey((k) => k + 1);
    }, 800); // pause length
    return () => clearTimeout(id);
  }, [inputValue]);

  const handleToastTest = () => {
    toast({
      type: "success",
      message: "Button Pressed!",
      icon: <CheckCircle size={20} style={{ color: "#4f55f1" }} />,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-8">
      <h1 className="text-2xl font-bold">Stripe-Style Button Demo</h1>

      {/* Toast Test Button */}
      <button
        onClick={handleToastTest}
        className="px-6 py-3 bg-[#4f55f1] text-white font-medium rounded-lg hover:bg-[#3f45d1] transition-colors shadow-md"
        style={{ fontFamily: "Aeonik Pro, sans-serif" }}
      >
        Test Toast Notification
      </button>

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
