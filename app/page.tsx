"use client";
import MainPage from "@/pages/Home";
import Speech from "@/pages/Speech";
import Translate from "@/pages/Translate";
import React, { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Mic,
  FileText,
  Languages,
  Volume2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="min-h-screen bg-black text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
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

            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-16 z-40 border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
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
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                  onClick={() => setActiveComponent(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isActive
                            ? "bg-gradient-to-br from-blue-500 to-purple-500"
                            : "bg-white/10"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isActive ? "text-white" : "text-white/70"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3
                            className={`font-semibold text-xl font-jetbrains-mono ${
                              isActive ? "text-white" : "text-white/90"
                            }`}
                          >
                            {item.label}
                          </h3>
                        </div>
                        <p
                          className={`text-sm mt-1 font-product-sans${
                            isActive ? "text-white/80" : "text-white/60"
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
        <Card className="bg-white/5 border-white/10 shadow-2xl">
          <CardContent className="p-0">{renderActiveComponent()}</CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 mt-16">
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
            <p className="text-sm text-white/60">
              © 2024 TranslateHub. Powered by cutting-edge AI translation
              technology.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <Badge
                variant="outline"
                className="text-white/60 border-white/20"
              >
                Real-time Translation
              </Badge>
              <Badge
                variant="outline"
                className="text-white/60 border-white/20"
              >
                Multi-language Support
              </Badge>
              <Badge
                variant="outline"
                className="text-white/60 border-white/20"
              >
                AI-Powered
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
