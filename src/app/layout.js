import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BunkSmart — Know Exactly When You Can Bunk",
  description:
    "Smart attendance tracker for college students. BunkSmart tracks your attendance and tells you if today is safe, risky, or absolutely not.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Global fixed purple glow — visible on every page */}
        <div
          style={{
            position: "fixed",
            top: "-150px",
            right: "-150px",
            width: "500px",
            height: "500px",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
          aria-hidden="true"
        />
        <AuthProvider>
          <AttendanceProvider>{children}</AttendanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
