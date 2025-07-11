"use client";
import MainPage from "@/pages/Home";
import Speech from "@/pages/Speech";
import Translate from "@/pages/Translate";
import React, { useState, useEffect } from "react";
import { Moon, Sun, Mic, FileText, Languages, Volume2 } from "lucide-react";

export default function Home() {
  const [activeComponent, setActiveComponent] = useState("main");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Apply theme to document
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navItems = [
    { id: "main", label: "Audio Translator", icon: Volume2 },
    { id: "translate", label: "Text Translator", icon: Languages },
    { id: "speech", label: "File to Text", icon: FileText },
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
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark"
          ? "dark bg-slate-950 text-slate-50"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">TranslateHub</h1>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveComponent(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeComponent === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          {renderActiveComponent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 TranslateHub. Powered by AI translation technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
