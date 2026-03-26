"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, signup, isOnboarded, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push(isOnboarded ? "/dashboard" : "/onboarding");
      return;
    }

    const stored = localStorage.getItem("bunksmart_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.email) {
          setIsLogin(true);
          setEmail(parsed.email);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [user, isOnboarded, loading, router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (isLogin) {
      const success = login(email, password);
      if (success) {
        router.push(isOnboarded ? "/dashboard" : "/onboarding");
      } else {
        setError("Invalid email or password");
      }
    } else {
      signup(email, password);
      router.push("/onboarding");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-8 md:p-10">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-violet hover:text-violet-light transition-colors mb-8"
          >
            <span>←</span>
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="page-title mb-3">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-sm mx-auto">
            {isLogin
              ? "Login to check your attendance"
              : "Start tracking your bunks"}
          </p>
        </div>

        {/* Form Card */}
        <div className="glow-card stat-glow p-8 md:p-10 rounded-2xl text-left">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block label-caps mb-2.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-violet transition-colors"
              />
            </div>

            <div>
              <label className="block label-caps mb-2.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-violet transition-colors"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-danger text-sm"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex justify-center">
              <button
                type="submit"
                className="w-full max-w-sm py-3.5 bg-gradient-to-r from-violet to-violet-dark rounded-xl text-white font-semibold btn-pulse"
              >
                {isLogin ? "Login" : "Sign up"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-muted hover:text-violet transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
