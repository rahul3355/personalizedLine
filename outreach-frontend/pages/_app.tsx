import "../styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
