import React from "react";
import { cn } from "@/lib/utils";

interface MacbookProps {
    src?: string; // Optional image source if just displaying an image
    children?: React.ReactNode; // Content to display on the screen
    className?: string;
}

export function Macbook({ src, children, className }: MacbookProps) {
    return (
        <div className={cn("relative mx-auto", className)}>
            {/* Lid / Screen Frame */}
            <div className="relative rounded-[2rem] bg-[#1a1a1a] p-[12px] shadow-2xl ring-1 ring-white/10">
                {/* Camera / Notch Area */}
                <div className="absolute left-1/2 top-0 z-20 h-4 w-32 -translate-x-1/2 rounded-b-xl bg-[#1a1a1a]">
                    {/* Camera lens */}
                    <div className="absolute left-1/2 top-[6px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0f0f0f] ring-1 ring-white/5"></div>
                </div>

                {/* Screen Content Area */}
                <div className="relative overflow-hidden rounded-[1.25rem] bg-black">
                    {src ? (
                        <img
                            src={src}
                            alt="Macbook Screen"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        children
                    )}
                </div>
            </div>

            {/* Bottom Base (Chin/Hinge) */}
            <div className="relative mx-auto -mt-2 h-[14px] w-[110%] max-w-[calc(100%+40px)] rounded-b-xl bg-[#e2e4e9] shadow-inner dark:bg-[#272729]">
                <div className="absolute left-1/2 top-0 h-[4px] w-16 -translate-x-1/2 rounded-b-md bg-[#1a1a1a]"></div>
            </div>
        </div>
    );
}
