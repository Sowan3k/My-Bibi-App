"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Sparkles,
  Flower2,
  BookOpen,
  Heart,
  LogOut,
  Menu,
  X,
  Hourglass,
  Mail,
  Star,
  Music,
  CalendarDays,
  Album,
  Map,
  Lightbulb,
  Gift,
  BellRing,
  HelpCircle,
  Settings,
} from "lucide-react";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import { AppearancePopover } from "@/components/ThemeControls";
import Onboarding, {
  shouldShowOnboarding,
  ONBOARDING_EVENT,
} from "@/components/Onboarding";

const navSections: {
  title: string;
  items: { href: string; label: string; icon: typeof Heart }[];
}[] = [
  {
    title: "Together",
    items: [
      { href: "/us", label: "Us", icon: MessageCircle },
      { href: "/memory", label: "Memory Garden", icon: Sparkles },
      { href: "/bloom", label: "Daily Bloom", icon: Flower2 },
      { href: "/little-things", label: "Little Things", icon: Heart },
    ],
  },
  {
    title: "Keepsakes",
    items: [
      { href: "/timeline", label: "Our Story", icon: CalendarDays },
      { href: "/map", label: "Garden Map", icon: Map },
      { href: "/capsules", label: "Time Capsules", icon: Hourglass },
      { href: "/letters", label: "Letters", icon: Mail },
      { href: "/dreams", label: "Dreams", icon: Star },
      { href: "/playlist", label: "Our Songs", icon: Music },
      { href: "/scrapbook", label: "Scrapbook", icon: Album },
    ],
  },
  {
    title: "Just me",
    items: [
      { href: "/journal", label: "My Pages", icon: BookOpen },
      { href: "/insights", label: "I Noticed", icon: Lightbulb },
      { href: "/gifts", label: "Gift Vault", icon: Gift },
    ],
  },
];

const bottomTabs = [
  { href: "/us", label: "Us", icon: MessageCircle },
  { href: "/memory", label: "Garden", icon: Sparkles },
  { href: "/bloom", label: "Bloom", icon: Flower2 },
  { href: "/little-things", label: "Little", icon: Heart },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pingToast, setPingToast] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // First-run tour + replay event (from Help/Settings)
  useEffect(() => {
    if (shouldShowOnboarding()) setShowOnboarding(true);
    const onReplay = () => setShowOnboarding(true);
    window.addEventListener(ONBOARDING_EVENT, onReplay);
    return () => window.removeEventListener(ONBOARDING_EVENT, onReplay);
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<User>("/api/auth/me");
        setUser(res.data);
      } catch {
        localStorage.removeItem("bibi_token");
        router.push("/login");
      }
    };
    fetchMe();
  }, [router]);

  // Poll partner status + unseen pings every 30s
  const checkPartner = useCallback(async () => {
    try {
      const res = await api.get<{
        partner_online: boolean;
        partner_name: string;
        unseen_pings: number;
      }>("/api/little-things/status");
      setPartnerOnline(res.data.partner_online ?? false);
      setPartnerName(res.data.partner_name ?? "");
      if ((res.data.unseen_pings ?? 0) > 0) {
        setPingToast(true);
        await api.post("/api/little-things/pings/seen").catch(() => {});
        setTimeout(() => setPingToast(false), 6000);
      }
    } catch {
      // Silently ignore
    }
  }, []);

  useEffect(() => {
    checkPartner();
    const interval = setInterval(checkPartner, 30_000);
    return () => clearInterval(interval);
  }, [checkPartner]);

  const handleLogout = () => {
    localStorage.removeItem("bibi_token");
    router.push("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav
      className={`flex flex-col h-full ${
        mobile ? "p-4" : "p-4"
      } bg-card border-r border-border transition-colors duration-300`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-4 px-1 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
          <Heart
            className="w-4 h-4 text-brand-400 animate-heartbeat"
            fill="currentColor"
          />
        </div>
        <span className="font-semibold text-foreground">My Bibi</span>
        {partnerOnline && (
          <span className="ml-auto flex items-center gap-1 text-xs text-sage-500 dark:text-sage-300">
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
            online
          </span>
        )}
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="nav-section">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`nav-item ${active ? "active" : ""}`}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom: help, settings, appearance + user */}
      <div className="border-t border-border pt-3 mt-3 space-y-0.5 flex-shrink-0">
        <Link
          href="/help"
          onClick={() => setSidebarOpen(false)}
          className={`nav-item ${pathname.startsWith("/help") ? "active" : ""}`}
        >
          <HelpCircle className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Help & guide</span>
        </Link>
        <Link
          href="/settings"
          onClick={() => setSidebarOpen(false)}
          className={`nav-item ${pathname.startsWith("/settings") ? "active" : ""}`}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Settings</span>
        </Link>
        <AppearancePopover />
        {user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left hover:text-red-400"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="modal-overlay" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 z-10 animate-drawer-in">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border transition-colors duration-300">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-brand-400" fill="currentColor" />
            <span className="font-semibold text-foreground text-sm">
              My Bibi
            </span>
          </div>
          {partnerOnline && (
            <span className="ml-auto flex items-center gap-1 text-xs text-sage-500 dark:text-sage-300">
              <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
              online
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scrollbar-thin pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border flex items-stretch transition-colors duration-300">
          {bottomTabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-brand-500 dark:text-brand-300"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon
                  className="w-5 h-5"
                  fill={active && tab.href === "/little-things" ? "currentColor" : "none"}
                />
                {tab.label}
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            More
          </button>
        </nav>
      </div>

      {/* First-run / replayed tour */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      {/* Thinking-of-you toast */}
      {pingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-pop-in">
          <div className="flex items-center gap-2.5 card-warm py-3 px-5 shadow-warm">
            <BellRing className="w-5 h-5 text-brand-400 animate-wiggle" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{partnerName}</span> is thinking
              of you 💭
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
