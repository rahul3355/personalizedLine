"use client";

import { useAuth } from "../lib/AuthProvider";

export default function Home() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    // Show login only
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-xl font-semibold">Please log in to continue</h1>
      </div>
    );
  }

  // Show features once logged in
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Welcome to Mailite</h1>
      <p className="text-gray-600">Hello, {session.user.email}</p>

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
