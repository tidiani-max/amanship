import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface User {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkPhone: (phone: string) => Promise<{ 
    exists: boolean; 
    firstLogin?: boolean; 
    isStaff?: boolean;
    requiresPasswordReset?: boolean;
    error?: string;
    message?: string;
  }>; // ✅ ADD THIS
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (
    phone: string,
    mode: "login" | "signup" | "forgot"
  ) => Promise<{ success: boolean; code?: string; error?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
    metadata?: {
      name?: string;
      email?: string;
      password?: string;
      mode: "login" | "signup" | "forgot"
    }
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithApple: (appleId: string, email?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleId: string, email?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; phone?: string; name?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  resetFirstLoginPassword: (phone: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = "@ZendO_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

const checkPhone = async (phone: string) => {
  try {
    console.log("📞 Checking phone:", phone);
    
    const response = await apiRequest("POST", "/api/auth/check-phone", { phone });
    const data = await response.json();
    
    console.log("📱 Check phone response:", data);
    
    if (response.ok) {
      return { 
        exists: data.exists,
        firstLogin: data.firstLogin,
        isStaff: data.isStaff,
        requiresPasswordReset: data.requiresPasswordReset,
        message: data.message
      };
    } else {
      return { exists: false, error: data.error || "Failed to check phone" };
    }
  } catch (error) {
    console.error("❌ Check phone network error:", error);
    return { exists: false, error: "Network error. Please try again." };
  }
};

const login = async (phone: string, password: string) => {
  try {
    console.log("🔐 Attempting login for:", phone);
    
    const response = await apiRequest("POST", "/api/auth/login", { phone, password });
    const data = await response.json();
    
    console.log("📥 Login response:", data);
    
    if (response.ok) {
      // ✅ Check if it's a first login staff member
      if (data.error === "first_login_required") {
        console.log("⚠️ First login required - should redirect to password reset");
        return { 
          success: false, 
          error: "first_login_required",
          requiresPasswordReset: true 
        };
      }
      
      // ✅ Normal successful login
      setUser(data.user);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      return { success: true };
    } else {
      return { success: false, error: data.error || "Login failed" };
    }
  } catch (error) {
    console.error("❌ Login network error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
};

  const signup = async (username: string, password: string, phone?: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", { username, password, phone });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || "Signup failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      console.log("✅ User logged out successfully");
    } catch (error) {
      console.error("❌ Failed to logout:", error);
    }
  };

  const updateProfile = async (data: { username?: string; phone?: string; name?: string; email?: string }) => {
    if (!user) return { success: false, error: "Not authenticated" };
    try {
      const response = await apiRequest("PUT", "/api/auth/profile", { userId: user.id, ...data });
      const result = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, ...data };
        setUser(updatedUser);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
        return { success: true };
      } else {
        return { success: false, error: result.error || "Update failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const sendOtp = async (phone: string, mode: "signup" | "forgot" | "login") => {
    try {
      const response = await apiRequest("POST", "/api/auth/otp/send", { phone, mode });
      const data = await response.json();
      if (response.ok) {
        return { success: true, code: data.code };
      } else {
        return { success: false, error: data.error || "Failed to send OTP" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifyOtp = async (
    phone: string,
    code: string,
    metadata?: { name?: string; email?: string; password?: string; mode: string }
  ) => {
    try {
      const response = await apiRequest("POST", "/api/auth/otp/verify", {
        phone,
        code,
        ...metadata
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || "Invalid OTP" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const loginWithApple = async (appleId: string, email?: string, fullName?: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/apple", { appleId, email, fullName });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || "Apple sign-in failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const loginWithGoogle = async (googleId: string, email?: string, name?: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/google", { googleId, email, name });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || "Google sign-in failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  // ✅ FUNCTION DEFINITION (already exists in your code)
const resetFirstLoginPassword = async (phone: string, newPassword: string) => {
  try {
    console.log("🔄 Resetting password for:", phone);
    
    const response = await apiRequest("POST", "/api/auth/reset-first-login", {
      phone,
      newPassword
    });

    const data = await response.json();

    console.log("📝 Reset password response:", data);

    if (response.ok && data.success) {
      // ✅ DO NOT auto-login after password reset
      // User should login manually with their new password
      return { success: true };
    }

    return { success: false, error: data.error || "Failed to reset password" };
  } catch (error) {
    console.error("❌ Reset password network error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
};

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        checkPhone,
        login,
        signup,
        sendOtp,
        verifyOtp,
        loginWithApple,
        loginWithGoogle,
        logout,
        updateProfile,
        resetFirstLoginPassword, // ✅ Already in provider value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}