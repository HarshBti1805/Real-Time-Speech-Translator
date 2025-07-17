"use client";
import MainPage from "@/pages/Home";
import Speech from "@/pages/Speech";
import Translate from "@/pages/Translate";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useTranslatePiP } from "@/pages/TranslatePiP";
import { useHomePiP } from "@/pages/HomePiP";
import {
  Moon,
  Sun,
  Mic,
  FileText,
  Languages,
  Volume2,
  Sparkles,
  Menu,
  X as CloseIcon,
  PictureInPicture,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TranscriptionHistorySidebar from "@/components/TranscriptionHistorySidebar";
import MiniBar from "@/components/MiniBar";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMiniBar, setShowMiniBar] = useState(false);
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
      id: "speech",
      label: "File to Text",
      icon: FileText,
      description: "Convert audio files to text",
      badge: "OCR Ready",
    },
  ];

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case "main":
        return <MainPage />;
      case "translate":
        return <Translate />;
      case "speech":
        return <Speech />;
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
      case "speech":
        return "1084px";
      default:
        return "100px";
    }
  };

  return (
    <>
      <MiniBar
        minimized={showMiniBar}
        setMinimized={setShowMiniBar}
        onSelect={(id) => {
          setActiveComponent(id);
        }}
      />
      <div className="overflow-hidden min-h-screen bg-background text-foreground transition-colors duration-300 flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <TranscriptionHistorySidebar height={getSidebarHeight()} />
        )}
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}

          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  {/* Sidebar toggle button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={
                      sidebarOpen
                        ? "Close history sidebar"
                        : "Open history sidebar"
                    }
                  >
                    {sidebarOpen ? (
                      <CloseIcon className="w-5 h-5" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </Button>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-jetbrains-mono font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      TranslateHub
                    </h1>
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center justify-end w-full">
                  <div className="flex items-center bg-muted/60 border border-border rounded-xl px-4 py-2 shadow-sm gap-4">
                    {/* Avatar and user info */}
                    {userImage ? (
                      <img
                        className="h-8 w-8 rounded-full border border-border shadow"
                        src={userImage}
                        alt={userName}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold border border-border shadow">
                        {userName[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex flex-col justify-center mr-2">
                      <span className="font-medium text-foreground leading-tight truncate max-w-[140px]">
                        {userName}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                        {userEmail}
                      </span>
                    </div>
                    {/* Sign Out button */}
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-600 text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="Sign out of your account"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
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
                      Sign Out
                    </button>
                    {/* Theme toggle */}
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
                    {/* PiP button at the end */}
                    {isPipSupported && (
                      <Button
                        onClick={openPictureInPicture}
                        variant="outline"
                        size="icon"
                        className="hover:bg-orange-100 border-orange-500 text-orange-700 shadow-amber-50 shadow cursor-pointer transition-colors ml-2"
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
                          <Minimize2 className="w-5 h-5" />
                        ) : (
                          <PictureInPicture className="w-5 h-5" />
                        )}
                      </Button>
                    )}
                    {/* HomePiP (Audio PiP) button - visually distinct */}
                    {isHomePipSupported && (
                      <Button
                        onClick={openHomePiP}
                        variant="outline"
                        size="icon"
                        className="hover:bg-green-100 border-green-500 text-green-700 ml-2 shadow-green-200 shadow cursor-pointer transition-colors"
                        title={
                          homePipWindow &&
                          !(homePipWindow as Window & { closed?: boolean })
                            .closed
                            ? "Close Audio PiP"
                            : "Open Audio PiP"
                        }
                        aria-label={
                          homePipWindow &&
                          !(homePipWindow as Window & { closed?: boolean })
                            .closed
                            ? "Close Audio PiP"
                            : "Open Audio PiP"
                        }
                      >
                        {/* Use a Mic icon for audio PiP */}
                        <Mic className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex justify-center items-center mx-auto px-4">
              <div className="flex space-x-5 py-4">
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
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
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
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3
                                className={`font-semibold text-xl font-jetbrains-mono ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-foreground/90"
                                }`}
                              >
                                {item.label}
                              </h3>
                            </div>
                            <p
                              className={`text-sm mt-1 font-product-sans ${
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
          </nav>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            <Card className="bg-card border-border shadow-2xl">
              <CardContent className="p-0">
                {renderActiveComponent()}
              </CardContent>
            </Card>
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-muted/50 mt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    TranslateHub
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  © 2025 TranslateHub. Powered by cutting-edge AI translation
                  technology.
                </p>
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    Real-time Translation
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    Multi-language Support
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    AI-Powered
                  </Badge>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
