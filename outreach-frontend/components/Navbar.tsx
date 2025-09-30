"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Home,
  CreditCard,
  Wallet2,
  ShieldCheck,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ComponentType,
  type CSSProperties,
  type FocusEvent,
} from "react";
import logo from "../pages/logo.png";
import { supabase } from "../lib/supabaseClient";

const classNames = (
  ...classes: Array<string | false | null | undefined>
) => classes.filter(Boolean).join(" ");

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  notification?: boolean;
}

const primaryItems: NavItem[] = [
  { key: "home", href: "/", label: "Home", icon: Home },
  { key: "cards", href: "/upload", label: "Cards", icon: CreditCard },
  { key: "payments", href: "/billing", label: "Payments", icon: Wallet2, notification: true },
  { key: "security", href: "/jobs", label: "Security", icon: ShieldCheck },
];

const secondaryItems: NavItem[] = [
  { key: "settings", href: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const router = useRouter();
  const [railOpen, setRailOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const tooltipTimer = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const activeKey = useMemo(() => {
    const pathname = router.pathname;
    if (pathname.startsWith("/jobs")) return "security";
    if (pathname.startsWith("/upload")) return "cards";
    if (pathname.startsWith("/billing")) return "payments";
    if (pathname.startsWith("/settings")) return "settings";
    return "home";
  }, [router.pathname]);

  useEffect(() => {
    const targetWidth = railOpen ? getComputedStyle(document.documentElement).getPropertyValue("--rail-expanded") || "256px" : getComputedStyle(document.documentElement).getPropertyValue("--rail-collapsed") || "80px";
    document.documentElement.style.setProperty("--rail-current", targetWidth.trim());
  }, [railOpen]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty("--rail-current", getComputedStyle(document.documentElement).getPropertyValue("--rail-collapsed") || "80px");
      if (tooltipTimer.current) {
        clearTimeout(tooltipTimer.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleMouseEnter = (key: string) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setHoveredItem(key), 120);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setHoveredItem(null);
  };

  const handleFocusOut = (event: FocusEvent<HTMLElement>) => {
    if (!navRef.current) return;
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !navRef.current.contains(nextTarget)) {
      setRailOpen(false);
    }
  };

  const renderNavButton = (item: NavItem, isSecondary = false) => {
    const Icon = item.icon;
    const isActive = activeKey === item.key;
    const pillClasses = classNames(
      "relative flex items-center w-full h-11 gap-3 px-3 transition-all",
      "duration-[var(--r-fast)] ease-[var(--r-ease)] focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(127,132,246,0.8)] focus-visible:ring-offset-white",
      isActive
        ? "text-[var(--r-primary-ink)] font-semibold"
        : "text-[#98A2B3] hover:text-[var(--r-on-bg)]"
    );

    const pillStyle: CSSProperties = {
      borderRadius: "var(--r-radius-squircle)",
      background: isActive ? "var(--r-active)" : "transparent",
      boxShadow: isActive ? "inset 0 0 0 1px rgba(127, 132, 246, 0.45)" : "none",
      transform: isActive ? "translateY(-1px)" : "translateY(0)",
    };

    const linkContent = (
      <>
        {isActive && (
          <span
            aria-hidden
            className="absolute"
            style={{
              left: "10px",
              top: "6px",
              bottom: "6px",
              width: "2px",
              borderRadius: "999px",
              background: "var(--r-primary)",
            }}
          />
        )}
        <span className="flex items-center gap-3 pl-2">
          <span className="relative flex items-center justify-center" style={{ width: "40px", height: "40px" }}>
            <Icon
              className={classNames(
                "transition-colors duration-[var(--r-fast)]",
                isActive ? "text-[var(--r-primary-ink)]" : "text-[#98A2B3]"
            )}
            style={{ width: "var(--r-icon)", height: "var(--r-icon)" }}
          />
          {item.notification && !isActive && (
            <span
              className="absolute"
              style={{
                top: "6px",
                right: "8px",
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                backgroundColor: "var(--r-primary)",
                boxShadow: "0 0 0 1px #fff",
              }}
            />
          )}
        </span>
        <span
          className={classNames(
            "text-sm",
            isActive ? "font-semibold" : "font-medium",
            !railOpen && "opacity-0 pointer-events-none",
            railOpen && "opacity-100"
          )}
          style={{ transition: `opacity var(--r-fast) var(--r-ease)` }}
        >
          {item.label}
        </span>
        </span>
      </>
    );

    const commonProps = {
      className: pillClasses,
      style: pillStyle,
      onMouseEnter: () => handleMouseEnter(item.key),
      onMouseLeave: handleMouseLeave,
      onFocus: () => setRailOpen(true),
      onBlur: handleFocusOut,
    };

    if (item.key === "settings" && isSecondary) {
      return (
        <button key={item.key} type="button" {...commonProps} onClick={() => router.push(item.href)}>
          {linkContent}
        </button>
      );
    }

    if (item.key === "logout") {
      return (
        <button key={item.key} type="button" {...commonProps} onClick={handleLogout}>
          {linkContent}
        </button>
      );
    }

    return (
      <Link key={item.key} href={item.href} {...commonProps}>
        {linkContent}
      </Link>
    );
  };

  const renderTooltip = (item: NavItem, index: number) => {
    if (railOpen || hoveredItem !== item.key) return null;
    const offset = 12 + index * 46;
    return (
      <div
        key={`${item.key}-tooltip`}
        className="pointer-events-none absolute left-full"
        style={{
          top: `${offset}px`,
          marginLeft: "12px",
          padding: "6px 12px",
          borderRadius: "var(--r-radius-squircle)",
          background: "#fff",
          boxShadow: "var(--r-shadow-float)",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--r-on-bg)",
          opacity: 1,
          transform: "scale(1)",
          transition: `opacity var(--r-fast) var(--r-ease), transform var(--r-fast) var(--r-ease)`,
        }}
      >
        {item.label}
      </div>
    );
  };

  const itemsWithLogout = [...secondaryItems, { key: "logout", href: "#", label: "Log out", icon: LogOut }];

  return (
    <>
      <aside
        className="hidden lg:flex fixed top-0 left-0 z-50 h-screen flex-col border-r"
        ref={navRef}
        style={{
          width: railOpen ? "var(--rail-expanded)" : "var(--rail-collapsed)",
          borderColor: "var(--r-border)",
          backgroundColor: "#fff",
          transition: `width var(--r-med) var(--r-ease)`,
        }}
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => {
          setRailOpen(false);
          handleMouseLeave();
        }}
      >
        <div className="flex items-center" style={{ padding: "12px 20px 16px" }}>
          <div className="relative" style={{ width: railOpen ? "168px" : "40px", height: "40px", transition: `width var(--r-med) var(--r-ease)` }}>
            <Image src={logo} alt="AuthorityPoint" fill sizes="(max-width: 256px) 100vw" style={{ objectFit: "contain" }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col" style={{ gap: "8px", padding: "12px" }}>
          {primaryItems.map((item) => renderNavButton(item))}
        </div>
        <div className="mt-auto w-full" style={{ borderTop: `1px solid var(--r-border)`, padding: "12px" }}>
          {itemsWithLogout.map((item) => renderNavButton(item, true))}
        </div>
        {!railOpen && (
          <div className="pointer-events-none absolute" style={{ top: 12, left: "100%" }}>
            {primaryItems.map((item, index) => renderTooltip(item, index))}
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40" style={{ background: "#fff", borderBottom: `1px solid var(--r-border)` }}>
        <div className="flex items-center justify-between px-4" style={{ height: "64px" }}>
          <Link href="/">
            <Image src={logo} alt="AuthorityPoint" width={120} height={32} />
          </Link>
          <div className="flex items-center gap-4 text-[#98A2B3]">
            <Bell className="w-5 h-5" />
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </>
  );
}
