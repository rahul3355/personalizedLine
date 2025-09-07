"use client";

import Link from "next/link";

export default function UploadProgress({ jobId }: { jobId: string }) {
  return (
    <div className="mt-4 p-4 border rounded-lg shadow">
      <p className="text-gray-700">
        Your job has been created and is now being processed.
      </p>
      <p className="mt-2">
        You can track live progress on the{" "}
        <Link href="/jobs" className="text-blue-600 underline">
          Jobs page
        </Link>.
      </p>
    </div>
  );
}
