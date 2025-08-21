"use client";
import { signIn, useSession } from "next-auth/react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Moon, Sun, Eye, EyeOff } from "lucide-react";

const RegisterPage = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Registration form, 2: OTP verification
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otpData, setOtpData] = useState({
    otp: "",
    tempToken: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    digit: false,
    special: false,
  });
  const router = useRouter();
  const { status } = useSession();

  // Theme management
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // OTP Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Password validation helper
  const checkPasswordStrength = (password: string) => {
    return {
      length: password.length >= 8 && password.length <= 20,
      uppercase: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(formData.password));
  }, [formData.password]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-blue-600 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render register form if user is authenticated
  if (status === "authenticated") {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setOtpData((prev) => ({
      ...prev,
      otp: numericValue,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    const { length, uppercase, digit, special } = checkPasswordStrength(
      formData.password
    );
    if (!length) {
      setError("Password must be 8-20 characters long");
      return false;
    }
    if (!uppercase) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!digit) {
      setError("Password must contain at least one digit");
      return false;
    }
    if (!special) {
      setError("Password must contain at least one special character");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setOtpData((prev) => ({ ...prev, tempToken: data.tempToken }));
      setCurrentStep(2);
      setOtpTimer(300); // 5 minutes timer
      setSuccess(`OTP sent to ${formData.email}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.message || "An error occurred while sending OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!otpData.otp || otpData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken: otpData.tempToken,
          otp: otpData.otp,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      setSuccess("Account created successfully! You can now sign in.");

      // Clear form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setOtpData({ otp: "", tempToken: "" });

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.message || "An error occurred during OTP verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken: otpData.tempToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend OTP");
      }

      setOtpTimer(300); // Reset timer
      setSuccess("OTP resent successfully!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.message || "An error occurred while resending OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true);
    setError("");
    try {
      await signIn(provider, {
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("OAuth sign in error:", error);
      setError("Authentication failed. Please try again.");
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex-col gap-5 mt-10 mb-10 bg-background text-foreground flex items-center justify-center transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-2">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-jetbrains-mono">
              TranslateHub
            </h2>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentStep === 1
              ? "Sign up to get started with your account"
              : `Enter the 6-digit code sent to ${formData.email}`}
          </p>
        </div>
        <div className="">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div
              className={`w-3 h-3 rounded-full ${
                currentStep >= 1 ? "bg-blue-500" : "bg-gray-300"
              }`}
            ></div>
            <div
              className={`w-8 h-0.5 ${
                currentStep >= 2 ? "bg-blue-500" : "bg-gray-300"
              }`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full ${
                currentStep >= 2 ? "bg-blue-500" : "bg-gray-300"
              }`}
            ></div>
          </div>
          {/* Theme Toggle */}
          <div className="flex mt-[-5] justify-center items-center">
            <div className="relative group">
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="icon"
                className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-background text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 border border-border shadow-lg">
                Toggle {theme === "dark" ? "Light" : "Dark"} Mode
              </span>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border shadow-2xl">
          <CardContent className="py-8 px-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}
            {currentStep === 1 ? (
              <>
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => setPasswordTouched(true)}
                        required
                        className="w-full px-3 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground pr-10"
                        placeholder="Create a password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground focus:outline-none"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {passwordTouched && (
                      <ul className="mt-2 text-xs space-y-1">
                        <li
                          className={
                            passwordStrength.length
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {passwordStrength.length ? "✓" : "✗"} 8-20 characters
                        </li>
                        <li
                          className={
                            passwordStrength.uppercase
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {passwordStrength.uppercase ? "✓" : "✗"} At least one
                          uppercase letter
                        </li>
                        <li
                          className={
                            passwordStrength.digit
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {passwordStrength.digit ? "✓" : "✗"} At least one
                          digit
                        </li>
                        <li
                          className={
                            passwordStrength.special
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {passwordStrength.special ? "✓" : "✗"} At least one
                          special character
                        </li>
                      </ul>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground pr-10"
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground focus:outline-none"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    onClick={handleSendOTP}
                    className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium"
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : null}
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </div>
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-card text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => handleOAuthSignIn("google")}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full inline-flex justify-center py-3 px-4 border border-border rounded-lg shadow-sm bg-background text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {/* Google SVG */}
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    onClick={() => handleOAuthSignIn("github")}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full inline-flex justify-center py-3 px-4 border border-border rounded-lg shadow-sm bg-background text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {/* GitHub SVG */}
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </Button>
                  <Button
                    onClick={() => handleOAuthSignIn("discord")}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full inline-flex justify-center py-3 px-4 border border-border rounded-lg shadow-sm bg-background text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {/* Discord SVG */}
                    <svg
                      className="h-5 w-5 translate-x-1 mr-3"
                      fill="currentColor"
                      viewBox="0 0 18 18"
                    >
                      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                    </svg>
                    Continue with Discord
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="h-8 w-8 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="otp"
                      className="block text-sm font-medium text-foreground mb-2 text-center"
                    >
                      Enter 6-digit code
                    </label>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      value={otpData.otp}
                      onChange={handleOtpChange}
                      required
                      maxLength={6}
                      className="w-full px-3 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest text-foreground placeholder-muted-foreground"
                      placeholder="000000"
                    />
                  </div>
                  {otpTimer > 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                      Code expires in {formatTime(otpTimer)}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoading || otpData.otp.length !== 6}
                    onClick={handleVerifyOTP}
                    className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium"
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : null}
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <div className="text-center space-y-2">
                    <Button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading || otpTimer > 0}
                      variant="link"
                      className="text-blue-600 hover:text-blue-500 disabled:text-muted-foreground disabled:cursor-not-allowed transition duration-200"
                    >
                      {otpTimer > 0
                        ? "Resend code in " + formatTime(otpTimer)
                        : "Resend code"}
                    </Button>
                    <div>
                      <Button
                        type="button"
                        onClick={() => {
                          setCurrentStep(1);
                          setOtpData({ otp: "", tempToken: "" });
                          setOtpTimer(0);
                          setError("");
                          setSuccess("");
                        }}
                        variant="link"
                        className="text-muted-foreground hover:text-foreground transition duration-200"
                      >
                        ← Back to registration
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
