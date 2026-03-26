"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("bunksmart_user");
    const loggedIn = localStorage.getItem("bunksmart_logged_in") === "true";
    const onboarded = localStorage.getItem("bunksmart_onboarded");
    if (stored && loggedIn) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
    if (onboarded === "true") setIsOnboarded(true);
    setLoading(false);
  }, []);

  const signup = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const newUser = { email: normalizedEmail, password: trimmedPassword };
    localStorage.setItem("bunksmart_user", JSON.stringify(newUser));
    localStorage.setItem("bunksmart_logged_in", "true");
    setUser(newUser);
  };

  const login = (email, password) => {
    const stored = localStorage.getItem("bunksmart_user");
    if (!stored) return false;
    const userData = JSON.parse(stored);
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (userData.email === normalizedEmail && userData.password === trimmedPassword) {
      localStorage.setItem("bunksmart_logged_in", "true");
      setUser(userData);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.setItem("bunksmart_logged_in", "false");
    localStorage.removeItem("bunksmart_subjects");
    localStorage.removeItem("bunksmart_notes");
    localStorage.removeItem("bunksmart_calendar");
    localStorage.removeItem("bunksmart_attendance_log");
    localStorage.removeItem("bunksmart_last_calendar_prompt");
    setUser(null);
  };

  const updateName = (name) => {
    const updated = { ...user, name };
    localStorage.setItem("bunksmart_user", JSON.stringify(updated));
    setUser(updated);
  };

  const completeOnboarding = () => {
    localStorage.setItem("bunksmart_onboarded", "true");
    setIsOnboarded(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOnboarded,
        signup,
        login,
        logout,
        updateName,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
