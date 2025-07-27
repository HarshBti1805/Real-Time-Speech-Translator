"use client";
import MainPage from "@/pages/Home";
import FileUploadPage from "@/pages/FileUploadPage";
import VoiceRecordingPage from "@/pages/VoiceRecordingPage";
import Translate from "@/pages/Translate";
import EnhancedChatBot from "@/components/EnhancedChatBot";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useTranslatePiP } from "@/components/PiP/TranslatePiP";
import { useHomePiP } from "@/components/PiP/HomePiP";
import {
  Moon,
  Sun,
  Mic,
  FileText,
  Camera,
  Languages,
  Volume2,
  Sparkles,
  Menu,
  X as CloseIcon,
  PictureInPicture,
  Minimize2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import Head from "next/head";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";

const MiniBar = dynamic(() => import("@/components/MiniBar"), { ssr: false });
const TranscriptionHistorySidebar = dynamic(
  () => import("@/components/TranscriptionHistorySidebar")
);

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeComponent, setActiveComponent] = useState("main");
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // Only open by default on large screens and up
    }
    return true;
  });
  const [showMiniBar, setShowMiniBar] = useState(false);
  // Remove all pipHooks, pipHooksLoaded, and related dynamic import logic
  // Use hooks as originally:
  const { isPipSupported, pipWindow, openPictureInPicture } = useTranslatePiP();
  const {
    isPipSupported: isHomePipSupported,
    pipWindow: homePipWindow,
    openHomePiP,
  } = useHomePiP();

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  // Remove all pipHooks, pipHooksLoaded, and related dynamic import logic
  // Use hooks as originally:
  // const { useTranslatePiP, useHomePiP } = pipHooks;
  // const { isPipSupported, pipWindow, openPictureInPicture } = useTranslatePiP();
  // const {
  //   isPipSupported: isHomePipSupported,
  //   pipWindow: homePipWindow,
  //   openHomePiP,
  // } = useHomePiP();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }
  const userName = session.user?.name || "?";
  const userEmail = session.user?.email || "";
  const userImage = session.user?.image || null;
  const navItems = [
    {
      id: "main",
      label: "Audio Translator",
      icon: Volume2,
      description: "Translate speech in real-time",
      badge: "AI Powered",
    },
    {
      id: "translate",
      label: "Text Translator",
      icon: Languages,
      description: "Translate text between languages",
      badge: "Multi-Lang",
    },
    {
      id: "fileupload",
      label: "Audio File Upload",
      icon: FileText,
      description: "Upload audio files for transcription",
      badge: "File Upload",
    },
    {
      id: "voicerecording",
      label: "Visual OCR",
      icon: Camera,
      description: "Extract text from images and screenshots",
      badge: "OCR Ready",
    },
  ];

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case "main":
        return <MainPage />;
      case "translate":
        return <Translate />;
      case "fileupload":
        return <FileUploadPage />;
      case "voicerecording":
        return <VoiceRecordingPage />;
      default:
        return <MainPage />;
    }
  };

  const getSidebarHeight = () => {
    switch (activeComponent) {
      case "main":
        return "970px";
      case "translate":
        return "1187px";
      case "fileupload":
        return "1084px";
      case "voicerecording":
        return "1200px";
      default:
        return "100px";
    }
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="theme-color"
          content={theme === "dark" ? "#18181b" : "#fff"}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="TranslateHub | Real-time AI Speech & Text Translator"
        />
        <meta
          property="og:description"
          content="AI-powered platform for real-time speech and text translation. Supports multiple languages, file-to-text, and more."
        />
        <meta property="og:image" content="/globe.svg" />
        <meta
          property="og:url"
          content="https://real-time-speech-translator-izn8.vercel.app/"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="TranslateHub | Real-time AI Speech & Text Translator"
        />
        <meta
          name="twitter:description"
          content="AI-powered platform for real-time speech and text translation. Supports multiple languages, file-to-text, and more."
        />
        <meta name="twitter:image" content="/globe.svg" />
        <link
          rel="canonical"
          href="https://real-time-speech-translator-izn8.vercel.app/"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "TranslateHub",
              url: "https://real-time-speech-translator-izn8.vercel.app/",
              description:
                "AI-powered platform for real-time speech and text translation. Supports multiple languages, file-to-text, and more.",
              publisher: {
                "@type": "Organization",
                name: "TranslateHub",
                logo: {
                  "@type": "ImageObject",
                  url: "/globe.svg",
                },
              },
            }),
          }}
        />
      </Head>
      <MiniBar
        minimized={showMiniBar}
        setMinimized={setShowMiniBar}
        onSelect={(id) => {
          setActiveComponent(id);
        }}
      />
      <main className="overflow-hidden min-h-screen bg-background text-foreground transition-colors duration-300 flex">
        {/* Sidebar - Responsive width */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="w-72 lg:w-80 xl:w-80 flex-shrink-0 max-w-[280px] lg:max-w-[320px] xl:max-w-none">
              <TranscriptionHistorySidebar
                key="sidebar"
                height={getSidebarHeight()}
                open={sidebarOpen}
              />
            </div>
          )}
        </AnimatePresence>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-auto w-full">
          {/* Header */}

          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-2 sm:px-4 min-w-0">
              <div className="flex items-center justify-between h-14 sm:h-16">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Sidebar toggle button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 sm:mr-2 h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={
                      sidebarOpen
                        ? "Close history sidebar"
                        : "Open history sidebar"
                    }
                  >
                    {sidebarOpen ? (
                      <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </Button>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <Mic className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-jetbrains-mono font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      TranslateHub
                    </h1>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center justify-end w-full">
                  {/* Desktop User Info */}
                  <div className="hidden lg:flex items-center bg-muted/60 border border-border rounded-xl px-3 lg:px-4 py-2 shadow-sm gap-2 lg:gap-4">
                    {/* Avatar and user info */}
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userName}
                        className="h-8 w-8 rounded-full border border-border shadow object-cover"
                        width={32}
                        height={32}
                        priority={true}
                        unoptimized
                      />
                    ) : (
                      <div className="h-8 w-8 font-mono rounded-full shadow flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg">
                        {session.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="flex flex-col justify-center mr-2">
                      <span className="font-medium text-foreground leading-tight truncate max-w-[120px] lg:max-w-[140px] text-sm">
                        {userName}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight truncate max-w-[120px] lg:max-w-[140px]">
                        {userEmail}
                      </span>
                    </div>
                    {/* Dashboard button */}
                    <Button
                      onClick={() => router.push("/dashboard")}
                      variant="outline"
                      size="sm"
                      className="hidden lg:flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm font-medium"
                      title="Go to dashboard"
                    >
                      <BarChart3 className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden xl:inline">Dashboard</span>
                      <span className="xl:hidden">Dash</span>
                    </Button>
                    {/* Sign Out button */}
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="inline-flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 border border-indigo-600 text-xs lg:text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="Sign out of your account"
                    >
                      <svg
                        className="w-3 h-3 lg:w-4 lg:h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                        />
                      </svg>
                      <span className="hidden xl:inline">Sign Out</span>
                      <span className="xl:hidden">Out</span>
                    </button>
                    {/* Theme toggle */}
                    <Button
                      onClick={toggleTheme}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors h-8 w-8 lg:h-10 lg:w-10"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 lg:w-5 lg:h-5" />
                      ) : (
                        <Moon className="w-4 h-4 lg:w-5 lg:h-5" />
                      )}
                    </Button>
                    {/* PiP button at the end */}
                    {isPipSupported && (
                      <Button
                        onClick={openPictureInPicture}
                        variant="outline"
                        size="icon"
                        className="hover:bg-orange-100 border-orange-500 text-orange-700 shadow-amber-50 shadow cursor-pointer transition-colors ml-1 lg:ml-2 h-8 w-8 lg:h-10 lg:w-10"
                        title={
                          pipWindow &&
                          !(pipWindow as Window & { closed?: boolean }).closed
                            ? "Close Picture-in-Picture"
                            : "Open Picture-in-Picture"
                        }
                        aria-label={
                          pipWindow &&
                          !(pipWindow as Window & { closed?: boolean }).closed
                            ? "Close Picture-in-Picture"
                            : "Open Picture-in-Picture"
                        }
                      >
                        {pipWindow &&
                        !(pipWindow as Window & { closed?: boolean }).closed ? (
                          <Minimize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <PictureInPicture className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </Button>
                    )}
                    {/* HomePiP (Audio PiP) button - visually distinct */}
                    {isHomePipSupported && (
                      <Button
                        onClick={openHomePiP}
                        variant="outline"
                        size="icon"
                        className="hover:bg-green-100 border-green-500 text-green-700 ml-1 lg:ml-2 shadow-green-200 shadow cursor-pointer transition-colors h-8 w-8 lg:h-10 lg:w-10"
                        title={
                          homePipWindow &&
                          !(
                            homePipWindow as Window & {
                              closed?: boolean;
                            }
                          ).closed
                            ? "Close Audio PiP"
                            : "Open Audio PiP"
                        }
                        aria-label={
                          homePipWindow &&
                          !(
                            homePipWindow as Window & {
                              closed?: boolean;
                            }
                          ).closed
                            ? "Close Audio PiP"
                            : "Open Audio PiP"
                        }
                      >
                        {/* Use a Mic icon for audio PiP */}
                        <Mic className="w-4 h-4 lg:w-5 lg:h-5" />
                      </Button>
                    )}
                  </div>

                  {/* Tablet User Info */}
                  <div className="hidden md:flex lg:hidden items-center space-x-2">
                    {/* Avatar */}
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userName}
                        className="h-8 w-8 rounded-full border border-border shadow object-cover"
                        width={32}
                        height={32}
                        priority={true}
                        unoptimized
                      />
                    ) : (
                      <div className="h-8 w-8 font-mono rounded-full shadow flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-sm">
                        {session.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    {/* Theme toggle */}
                    <Button
                      onClick={toggleTheme}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors h-8 w-8"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )}
                    </Button>
                    {/* Sign Out */}
                    <Button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-50 border-red-200 text-red-700 h-8 w-8"
                      title="Sign out"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                        />
                      </svg>
                    </Button>
                  </div>

                  {/* Mobile User Info */}
                  <div className="md:hidden flex items-center space-x-1 sm:space-x-2">
                    {/* Mobile Avatar */}
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userName}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border shadow object-cover"
                        width={32}
                        height={32}
                        priority={true}
                        unoptimized
                      />
                    ) : (
                      <div className="h-7 w-7 sm:h-8 sm:w-8 font-mono rounded-full shadow flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-xs sm:text-sm">
                        {session.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    {/* Mobile Theme Toggle */}
                    <Button
                      onClick={toggleTheme}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors h-7 w-7 sm:h-8 sm:w-8"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-3 h-3 sm:w-4 sm:h-4" />
                      ) : (
                        <Moon className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                    </Button>
                    {/* Mobile Sign Out */}
                    <Button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-50 border-red-200 text-red-700 h-7 w-7 sm:h-8 sm:w-8"
                      title="Sign out"
                    >
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="sticky top-14 sm:top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-2 sm:px-4 min-w-0">
              {/* Desktop Navigation */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="flex space-x-3 xl:space-x-5 py-3 lg:py-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeComponent === item.id;
                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 min-w-[200px] xl:min-w-[240px] ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25"
                            : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20"
                        }`}
                        onClick={() => setActiveComponent(item.id)}
                      >
                        <CardContent className="p-3 lg:p-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg flex-shrink-0 ${
                                isActive
                                  ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                  : "bg-muted"
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 ${
                                  isActive
                                    ? "text-white"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3
                                  className={`font-semibold text-lg xl:text-xl font-jetbrains-mono truncate ${
                                    isActive
                                      ? "text-foreground"
                                      : "text-foreground/90"
                                  }`}
                                >
                                  {item.label}
                                </h3>
                              </div>
                              <p
                                className={`text-xs lg:text-sm mt-1 font-product-sans line-clamp-2 ${
                                  isActive
                                    ? "text-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Tablet Navigation */}
              <div className="hidden md:flex lg:hidden py-3">
                <div className="grid grid-cols-3 gap-2 w-full">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeComponent === item.id;
                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25"
                            : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20"
                        }`}
                        onClick={() => setActiveComponent(item.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center space-y-2 text-center">
                            <div
                              className={`p-2 rounded-lg ${
                                isActive
                                  ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                  : "bg-muted"
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 ${
                                  isActive
                                    ? "text-white"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-semibold text-sm font-jetbrains-mono truncate ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-foreground/90"
                                }`}
                              >
                                {item.label}
                              </h3>
                              <p
                                className={`text-xs mt-1 font-product-sans line-clamp-2 ${
                                  isActive
                                    ? "text-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden py-3">
                <div className="grid grid-cols-1 gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeComponent === item.id;
                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25"
                            : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20"
                        }`}
                        onClick={() => setActiveComponent(item.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg flex-shrink-0 ${
                                isActive
                                  ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                  : "bg-muted"
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                  isActive
                                    ? "text-white"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3
                                  className={`font-semibold text-base sm:text-lg font-jetbrains-mono truncate ${
                                    isActive
                                      ? "text-foreground"
                                      : "text-foreground/90"
                                  }`}
                                >
                                  {item.label}
                                </h3>
                              </div>
                              <p
                                className={`text-xs sm:text-sm mt-1 font-product-sans line-clamp-2 ${
                                  isActive
                                    ? "text-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="px-2 sm:px-4 py-3 sm:py-4 lg:py-6 min-w-0">
            <Card className="bg-card border-border shadow-2xl">
              <CardContent className="p-0">
                {renderActiveComponent()}
              </CardContent>
            </Card>
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-muted/50 mt-6 sm:mt-8 lg:mt-12">
            <div className="px-3 sm:px-4 py-4 sm:py-6 lg:py-8 min-w-0">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    TranslateHub
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  © 2025 TranslateHub. Powered by cutting-edge AI translation
                  technology.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4 mt-3 sm:mt-4 px-2">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border text-xs"
                  >
                    Real-time Translation
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border text-xs"
                  >
                    Multi-language Support
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border text-xs"
                  >
                    AI-Powered
                  </Badge>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* AI Chatbot - Enhanced with better context awareness */}
        <EnhancedChatBot
          currentMode={activeComponent}
          currentTranslation={undefined}
          sourceLanguage={undefined}
          targetLanguage={undefined}
        />
      </main>
    </>
  );
}
