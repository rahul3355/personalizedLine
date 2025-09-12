"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Upload } from "lucide-react";

type Status = "idle" | "processing" | "success";

export default function BlackUploadBox() {
  const [status, setStatus] = useState<Status>("idle");
  const [shine, setShine] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger shine when file is uploaded
  useEffect(() => {
    if (fileName && status === "idle") {
      setShine(true);
      const id = setTimeout(() => setShine(false), 800);
      return () => clearTimeout(id);
    }
  }, [fileName, status]);

  // Re-shine every 3s when hovered
  useEffect(() => {
    if (!hovered || !fileName || status !== "idle") return;
    const interval = setInterval(() => {
      setShine(true);
      setTimeout(() => setShine(false), 800);
    }, 3000);
    return () => clearInterval(interval);
  }, [hovered, fileName, status]);

  const handleFileUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setFileName(file.name);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleBrowse = () => {
    if (status !== "idle") return;
    fileInputRef.current?.click();
  };

  const handleClick = () => {
    if (!fileName || status !== "idle") return;
    setStatus("processing");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
      setFileName(null);
    }, 2500);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Drag & Drop Area */}
      <div
        onClick={handleBrowse}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-white"
      >
        <Upload className="h-8 w-8 text-gray-500 mb-3" />
        {fileName ? (
          <span className="text-gray-700 font-medium">{fileName}</span>
        ) : (
          <span className="text-gray-500">Drag & drop Excel file or click to browse</span>
        )}
      </div>

      <input
        type="file"
        accept=".xls,.xlsx"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Premium Apple-Style Action Button */}
      <motion.button
        onClick={handleClick}
        disabled={!fileName}
        onMouseDown={() => status === "idle" && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => {
          setIsPressed(false);
          setHovered(false);
        }}
        onBlur={() => setIsPressed(false)}
        onMouseEnter={() => setHovered(true)}
        className={`mt-6 w-full h-12 rounded-lg flex items-center justify-center font-semibold relative overflow-hidden transition-all
          ${!fileName ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"}`}
        style={{
          background:
            status === "success"
              ? "#2ecc71"
              : "linear-gradient(to bottom, #3a3a3a, #1c1c1c)", // vertical gradient
          boxShadow:
            isPressed && status === "idle" && fileName
              ? "0 0 0 3px rgba(128,128,128,0.6)" // grey outer border when pressed
              : "0 2px 6px rgba(0,0,0,0.5)", // subtle drop shadow always
          color: "#fff",
          textShadow: status === "idle" ? "0 1px 2px rgba(0,0,0,0.7)" : "none", // embossed text look
          borderTop: status !== "success" ? "1px solid rgba(255,255,255,0.1)" : undefined, // top highlight
          borderBottom:
            status !== "success" ? "1px solid rgba(0,0,0,0.4)" : undefined, // bottom edge
        }}
      >
        {/* Shine overlay */}
        {shine && (
          <motion.div
            key={fileName + status + Math.random()}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
  {status === "idle" && (
    <motion.div
      key="idle"
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
    >
      <span>Proceed</span>
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: hovered ? 6 : 0 }} // slide right on hover
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* white arrow icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </motion.div>
  )}
  {status === "processing" && (
    <motion.div
      key="processing"
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span>Processing…</span>
      <Loader2 className="h-4 w-4 animate-spin text-white" />
    </motion.div>
  )}
  {status === "success" && (
    <motion.div
      key="success"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Check className="h-6 w-6 text-white" />
    </motion.div>
  )}
</AnimatePresence>

      </motion.button>
    </div>
  );
}
