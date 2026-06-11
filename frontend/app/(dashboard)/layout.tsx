"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Sparkles,
  Flower2,
  BookOpen,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import api from "@/lib/api";
import type { User } from "@/lib/types";

const navItems = [
  {
    href: "/us",
    label: "Us",
    icon: MessageCircle,
    description: "Shared chat",
  },
  {
    href: "/memory",
    label: "Memory Garden",
    icon: Sparkles,
    description: "Saved moments",
  },
  {
    href: "/bloom",
    label: "Daily Bloom",
    icon: Flower2,
    description: "Today's ritual",
  },
  {
    href: "/journal",
    label: "My Pages",
    icon: BookOpen,
    description: "Private journal",
  },
  {
    href: "/little-things",
    label: "Little Things",
    icon: Heart,
    description: "Streak & pings",
  },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<User>("/api/auth/me");
        setUser(res.data);
      } catch {
        // Token expired or invalid — redirect to login
        localStorage.removeItem("bibi_token");
        router.push("/login");
      }
    };
    fetchMe();
  }, [router]);

  // Poll partner status every 30s (simple "was active in last 5 min" check)
  useEffect(() => {
    const checkPartner = async () => {
      try {
        const res = await api.get<{ partner_online: boolean }>(
          "/api/little-things/status"
        );
        setPartnerOnline(res.data.partner_online ?? false);
      } catch {
        // Silently ignore
      }
    };
    checkPartner();
    const interval = setInterval(checkPartner, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("bibi_token");
    router.push("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav
      className={`flex flex-col h-full ${
        mobile ? "p-4" : "p-5"
      } bg-white border-r border-cream-200`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-1">
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
          <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
        </div>
        <span className="font-semibold text-foreground">My Bibi</span>
        {/* Partner online indicator */}
        {partnerOnline && (
          <span className="ml-auto flex items-center gap-1 text-xs text-sage-500">
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
            online
          </span>
        )}
      </div>

      {/* Nav items */}
      <ul className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* User section */}
      <div className="border-t border-cream-200 pt-4 mt-4 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-muted-foreground hover:text-red-400"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-cream-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 z-10">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-cream-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-cream-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
            <span className="font-semibold text-foreground text-sm">
              My Bibi
            </span>
          </div>
          {partnerOnline && (
            <span className="ml-auto flex items-center gap-1 text-xs text-sage-500">
              <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
              online
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
