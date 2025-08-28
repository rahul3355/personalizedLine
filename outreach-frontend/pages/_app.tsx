import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="p-6">
        <Component {...pageProps} />
      </main>
    </div>
  );
}