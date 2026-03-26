"use client";

import { useRouter } from "next/navigation";

/**
 * @param {"dashboard"|"calendar"|"calculator"|"notifications"} active
 * @param {number} [notificationBadge]
 */
export default function BottomNav({ active, notificationBadge = 0 }) {
  const router = useRouter();

  const items = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
    { id: "calendar", label: "Calendar", icon: "📅", path: "/calendar" },
    { id: "calculator", label: "Calculator", icon: "🧮", path: "/calculator" },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
      path: "/notifications",
      showBadge: true,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
      style={{
        background: "rgba(10,15,30,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-around gap-1">
        {items.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={active === item.id}
            badge={
              item.showBadge && notificationBadge > 0 ? notificationBadge : 0
            }
            onClick={() => router.push(item.path)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ label, icon, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-end gap-1 min-w-[4.5rem] sm:min-w-[5.5rem] pt-2 pb-3 rounded-2xl transition-colors ${
        active
          ? "text-violet-light"
          : "text-muted hover:text-foreground/90"
      }`}
    >
      <span className="text-[1.35rem] leading-none relative">
        {icon}
        {badge > 0 && (
          <span className="notif-badge">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
      {active && (
        <span
          className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-11 rounded-full bg-gradient-to-r from-violet via-violet-light to-cyan shadow-[0_0_14px_rgba(124,58,237,0.85),0_0_22px_rgba(56,189,248,0.35)]"
          aria-hidden
        />
      )}
    </button>
  );
}
