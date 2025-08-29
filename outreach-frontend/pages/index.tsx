"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  if (!user) {
    // Show login only
    return (
      <div className="flex items-center justify-center min-h-screen">
        
      </div>
    );
  }

  // Show features once logged in
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Welcome to Mailite</h1>
      <p className="text-gray-600">Hello, {user.name}</p>

      {/* Your existing features */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Upload a File</h2>
        <p className="text-gray-500">Go to the Upload page to add your file.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Past Files</h2>
        <p className="text-gray-500">Check your uploaded files in Jobs page.</p>
      </section>
    </div>
  );
}
