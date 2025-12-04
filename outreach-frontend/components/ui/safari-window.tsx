import React from "react";
import { cn } from "@/lib/utils";

interface SafariWindowProps {
    children?: React.ReactNode;
    className?: string;
    url?: string;
}

export function SafariWindow({ children, className, url = "senditfast.ai" }: SafariWindowProps) {
    return (
        <div className={cn("relative overflow-hidden rounded-xl border border-gray-200 bg-white", className)}>
            {/* Browser Toolbar */}
            <div className="flex items-center gap-x-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3 backdrop-blur-xl">
                {/* Traffic Lights */}
                <div className="flex gap-x-2">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F56] ring-1 ring-black/5"></div>
                    <div className="h-3 w-3 rounded-full bg-[#FFBD2E] ring-1 ring-black/5"></div>
                    <div className="h-3 w-3 rounded-full bg-[#27C93F] ring-1 ring-black/5"></div>
                </div>

                {/* Address Bar */}
                <div className="flex flex-1 justify-center">
                    <div className="flex w-full max-w-md items-center justify-center gap-x-2 rounded-md bg-white py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-200/50">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-3 w-3 opacity-50"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        <span>{url}</span>
                    </div>
                </div>

                {/* Spacer to balance the header */}
                <div className="w-14"></div>
            </div>

            {/* Content Area */}
            <div className="relative bg-white">
                {children}
            </div>
        </div>
    );
}
