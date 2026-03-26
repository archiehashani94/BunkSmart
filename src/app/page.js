"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import WaveBackground from "@/components/WaveBackground";

export default function LandingPage() {
  const router = useRouter();
  const { user, isOnboarded, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (isOnboarded) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [user, isOnboarded, loading, router]);

  return (
    <div style={{ background: "#0a0f1e", minHeight: "100vh" }}>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,15,30,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "20px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            <span style={{ color: "#fff" }}>Bunk</span>
            <span style={{ color: "#a78bfa" }}>Smart</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => router.push("/login")}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
                padding: "8px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              Login
            </button>
            <button
              onClick={() => router.push("/login")}
              style={{
                background: "#7c3aed",
                border: "none",
                color: "#fff",
                padding: "8px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#6d28d9";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#7c3aed";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>

        {/* Animated wave background */}
        <WaveBackground />

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "720px",
            margin: "0 auto",
            textAlign: "center",
            paddingTop: "120px",
            paddingBottom: "80px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
        >
          {/* Badge */}
          <div style={{ marginBottom: "32px", opacity: 0, animation: "fadeUp 0.6s ease 0.2s forwards" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 18px",
                borderRadius: "999px",
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#a78bfa",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              ✦ Smart Attendance Tracking
            </span>
          </div>

          {/* H1 */}
          <h1
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "0 0 28px 0",
              opacity: 0,
              animation: "fadeUp 0.6s ease 0.4s forwards",
            }}
          >
            <span style={{ color: "#fff" }}>Know Exactly</span>
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #a78bfa, #38bdf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              When to Bunk.
            </span>
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.55)",
              maxWidth: "500px",
              margin: "0 auto 36px",
              opacity: 0,
              animation: "fadeUp 0.6s ease 0.6s forwards",
            }}
          >
            Upload your timetable, set your target, and BunkSmart tells you
            which classes are{" "}
            <span style={{ color: "#4ade80", fontWeight: 600 }}>SAFE</span>,{" "}
            <span style={{ color: "#facc15", fontWeight: 600 }}>RISKY</span>, or{" "}
            <span style={{ color: "#f87171", fontWeight: 600 }}>ABSOLUTE NO</span>{" "}
            to skip.
          </p>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              marginBottom: "28px",
              opacity: 0,
              animation: "fadeUp 0.6s ease 0.8s forwards",
            }}
          >
            <button
              onClick={() => router.push("/login")}
              style={{
                background: "#7c3aed",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "none",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "transparent",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "15px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              See Demo →
            </button>
          </div>

          {/* Chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px",
              opacity: 0,
              animation: "fadeUp 0.6s ease 1.0s forwards",
            }}
          >
            {["Upload Timetable PDF", "Auto Bunk Budget", "Calendar Attendance", "Smart Notifications"].map(
              (chip) => (
                <span
                  key={chip}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {chip}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "56px 48px 64px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          opacity: 0,
          animation: "fadeUp 0.6s ease 1.2s forwards",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            textAlign: "center",
          }}
        >
          <StatItem number="500+" label="Students" />
          <StatItem number="75%" label="Min Attendance" hasBorders />
          <StatItem number="4+" label="Colleges" />
        </div>
      </section>
    </div>
  );
}

function StatItem({ number, label, hasBorders }) {
  return (
    <div
      style={{
        padding: "16px 12px",
        ...(hasBorders
          ? {
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }
          : {}),
      }}
    >
      <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.15 }}>
        {number}
      </div>
      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginTop: "10px" }}>
        {label}
      </div>
    </div>
  );
}
