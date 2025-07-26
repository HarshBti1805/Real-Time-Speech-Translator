"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Languages,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  Crown,
  Globe,
  Target,
  TrendingUp,
  Clock,
  Sparkles,
  Filter,
  Heart,
  MapPin,
} from "lucide-react";
import { getLanguageName, getLanguageFlag } from "@/lib/languages";

interface Translation {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  date: string;
  inputType?: string;
  inputValue?: string;
  outputValue?: string;
  createdAt?: string;
}

interface UserPreferences {
  favoriteSourceLanguages: string[];
  favoriteTargetLanguages: string[];
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  theme: string;
  notificationsEnabled: boolean;
  autoSaveEnabled: boolean;
}

interface LanguagesAndHistoryProps {
  translations: Translation[];
  preferences: UserPreferences | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onUpdatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  analytics?: {
    totalTranslations: number;
    totalWords: number;
    totalCharacters: number;
    averageWordsPerTranslation: number;
    period: string;
    recentTranslations: Translation[];
  } | null;
}

// Available languages for showcase with categories and enhanced metadata
const availableLanguages = [
  {
    category: "Popular",
    icon: "🔥",
    description: "Most commonly used languages worldwide",
    languages: [
      {
        code: "en",
        name: "English",
        flag: "🇺🇸",
        region: "United States",
        speakers: "1.5B+",
      },
      {
        code: "es",
        name: "Spanish",
        flag: "🇪🇸",
        region: "Spain",
        speakers: "559M+",
      },
      {
        code: "fr",
        name: "French",
        flag: "🇫🇷",
        region: "France",
        speakers: "280M+",
      },
      {
        code: "de",
        name: "German",
        flag: "🇩🇪",
        region: "Germany",
        speakers: "132M+",
      },
      {
        code: "it",
        name: "Italian",
        flag: "🇮🇹",
        region: "Italy",
        speakers: "65M+",
      },
      {
        code: "pt",
        name: "Portuguese",
        flag: "🇵🇹",
        region: "Portugal",
        speakers: "260M+",
      },
    ],
  },
  {
    category: "Asian",
    icon: "🌏",
    description: "Languages from the Asian continent",
    languages: [
      {
        code: "ja",
        name: "Japanese",
        flag: "🇯🇵",
        region: "Japan",
        speakers: "125M+",
      },
      {
        code: "ko",
        name: "Korean",
        flag: "🇰🇷",
        region: "South Korea",
        speakers: "77M+",
      },
      {
        code: "zh",
        name: "Chinese",
        flag: "🇨🇳",
        region: "China",
        speakers: "918M+",
      },
      {
        code: "hi",
        name: "Hindi",
        flag: "🇮🇳",
        region: "India",
        speakers: "602M+",
      },
      {
        code: "ar",
        name: "Arabic",
        flag: "🇸🇦",
        region: "Saudi Arabia",
        speakers: "422M+",
      },
      {
        code: "tr",
        name: "Turkish",
        flag: "🇹🇷",
        region: "Turkey",
        speakers: "88M+",
      },
    ],
  },
  {
    category: "European",
    icon: "🇪🇺",
    description: "Languages from the European region",
    languages: [
      {
        code: "ru",
        name: "Russian",
        flag: "🇷🇺",
        region: "Russia",
        speakers: "258M+",
      },
      {
        code: "nl",
        name: "Dutch",
        flag: "🇳🇱",
        region: "Netherlands",
        speakers: "24M+",
      },
      {
        code: "pl",
        name: "Polish",
        flag: "🇵🇱",
        region: "Poland",
        speakers: "40M+",
      },
      {
        code: "sv",
        name: "Swedish",
        flag: "🇸🇪",
        region: "Sweden",
        speakers: "10M+",
      },
      {
        code: "da",
        name: "Danish",
        flag: "🇩🇰",
        region: "Denmark",
        speakers: "6M+",
      },
      {
        code: "no",
        name: "Norwegian",
        flag: "🇳🇴",
        region: "Norway",
        speakers: "5M+",
      },
      {
        code: "fi",
        name: "Finnish",
        flag: "🇫🇮",
        region: "Finland",
        speakers: "5.5M+",
      },
      {
        code: "cs",
        name: "Czech",
        flag: "🇨🇿",
        region: "Czech Republic",
        speakers: "10M+",
      },
    ],
  },
];

const LanguagesManager = ({
  translations,
  preferences,
  onRefresh,
  isRefreshing = false,
  onUpdatePreferences,
  analytics,
}: LanguagesAndHistoryProps) => {
  const [showAddLanguage, setShowAddLanguage] = useState<{
    show: boolean;
    type: "source" | "target";
  }>({ show: false, type: "source" });
  const [languageSearchTerm, setLanguageSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);

  const removeFavoriteLanguage = async (
    languageCode: string,
    type: "source" | "target"
  ) => {
    if (!preferences) return;

    const key =
      type === "source" ? "favoriteSourceLanguages" : "favoriteTargetLanguages";
    const currentList = preferences[key];

    await onUpdatePreferences({
      [key]: currentList.filter((lang) => lang !== languageCode),
    });
  };

  const setDefaultLanguage = async (
    languageCode: string,
    type: "source" | "target"
  ) => {
    if (!preferences) return;

    const key =
      type === "source" ? "defaultSourceLanguage" : "defaultTargetLanguage";
    await onUpdatePreferences({
      [key]: languageCode,
    });
  };

  const addFavoriteLanguage = async (
    languageCode: string,
    type: "source" | "target"
  ) => {
    if (!preferences) return;

    const key =
      type === "source" ? "favoriteSourceLanguages" : "favoriteTargetLanguages";
    const currentList = preferences[key];

    if (!currentList.includes(languageCode)) {
      await onUpdatePreferences({
        [key]: [...currentList, languageCode],
      });
    }
    setShowAddLanguage({ show: false, type: "source" });
    setLanguageSearchTerm("");
    setSelectedCategory("all");
  };

  // Calculate language statistics
  const calculateLanguageStats = () => {
    // Try to get language data from multiple sources
    let sourceLanguagesCount = 0;
    let targetLanguagesCount = 0;

    // First, try to get from recent translations
    if (translations && translations.length > 0) {
      const sourceLanguages = new Set(
        translations
          .filter((t) => t.sourceLanguage && t.sourceLanguage.trim() !== "")
          .map((t) => t.sourceLanguage)
      );

      const targetLanguages = new Set(
        translations
          .filter((t) => t.targetLanguage && t.targetLanguage.trim() !== "")
          .map((t) => t.targetLanguage)
      );

      sourceLanguagesCount = sourceLanguages.size;
      targetLanguagesCount = targetLanguages.size;
    }

    // If we don't have language data from translations, estimate from user preferences
    if (
      sourceLanguagesCount === 0 &&
      preferences?.favoriteSourceLanguages?.length
    ) {
      sourceLanguagesCount = preferences.favoriteSourceLanguages.length;
    }

    if (
      targetLanguagesCount === 0 &&
      preferences?.favoriteTargetLanguages?.length
    ) {
      targetLanguagesCount = preferences.favoriteTargetLanguages.length;
    }

    // Fallback: if user has translations but no language data, estimate minimal usage
    if (
      sourceLanguagesCount === 0 &&
      analytics?.totalTranslations &&
      analytics.totalTranslations > 0
    ) {
      sourceLanguagesCount = 1; // At least English
    }

    if (
      targetLanguagesCount === 0 &&
      analytics?.totalTranslations &&
      analytics.totalTranslations > 0
    ) {
      targetLanguagesCount = 1; // At least one target language
    }

    // Calculate daily average from total translations
    const totalTranslations = analytics?.totalTranslations || 0;
    const period = parseInt(analytics?.period || "30");
    const dailyAverage =
      period > 0 ? Math.round(totalTranslations / period) : 0;

    return {
      sourceLanguagesCount,
      targetLanguagesCount,
      dailyAverage,
    };
  };

  const languageStats = calculateLanguageStats();

  // Filter languages for the modal
  const filteredLanguages = availableLanguages
    .map((category) => ({
      ...category,
      languages: category.languages.filter((lang) => {
        const matchesSearch =
          lang.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
          lang.region
            .toLowerCase()
            .includes(languageSearchTerm.toLowerCase()) ||
          lang.code.toLowerCase().includes(languageSearchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || category.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    }))
    .filter((category) => category.languages.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-mono bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Language Manager
          </h2>
          <p className="text-muted-foreground font-mono mt-2">
            Manage your favorite languages for seamless translation
          </p>
        </div>
        <motion.button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-xs font-mono font-medium px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20 hover:from-cyan-500/20 hover:via-blue-500/20 hover:to-purple-500/20 dark:hover:from-cyan-400/30 dark:hover:via-blue-400/30 dark:hover:to-purple-400/30 border border-cyan-500/30 dark:border-cyan-400/40 flex items-center gap-2 text-cyan-600 dark:text-cyan-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          whileHover={{
            scale: isRefreshing ? 1 : 1.05,
            boxShadow: isRefreshing
              ? "0 0 0 rgba(6, 182, 212, 0)"
              : "0 10px 25px rgba(6, 182, 212, 0.2)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{
              duration: 1,
              repeat: isRefreshing ? Infinity : 0,
              ease: "linear",
            }}
            className="relative"
          >
            <RefreshCw className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            {isRefreshing && (
              <motion.div
                className="absolute inset-0 w-4 h-4 bg-cyan-400/20 rounded-full blur-sm"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
          <span className="font-mono font-semibold">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </motion.button>
      </div>

      {/* Language Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Favorite Source Languages */}
        <Card className="hover:shadow-xl transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-blue-400/5 to-cyan-500/5 border-blue-200/30 overflow-hidden backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border-b border-blue-200/30">
            <CardTitle className="flex items-center space-x-4 font-mono">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-300/20">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <span className="text-xl bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Source Languages
                </span>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs bg-blue-100 dark:bg-blue-900/30"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    {preferences?.favoriteSourceLanguages?.length || 0}{" "}
                    favorites
                  </Badge>
                  {preferences?.defaultSourceLanguage && (
                    <Badge
                      variant="outline"
                      className="font-mono text-xs bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-600"
                    >
                      <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                      {getLanguageName(preferences.defaultSourceLanguage)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <AnimatePresence>
              {preferences?.favoriteSourceLanguages?.map((langCode, index) => (
                <motion.div
                  key={langCode}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="group relative bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200/40 dark:border-blue-700/40 rounded-2xl p-5 hover:from-blue-100/90 hover:to-cyan-100/90 dark:hover:from-blue-800/30 dark:hover:to-cyan-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <motion.span
                          className="text-4xl drop-shadow-sm"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {getLanguageFlag(langCode)}
                        </motion.span>
                        {preferences.defaultSourceLanguage === langCode && (
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.3,
                              type: "spring",
                              stiffness: 300,
                            }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold font-mono text-gray-900 dark:text-white text-lg">
                          {getLanguageName(langCode)}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-mono font-medium">
                          {langCode.toUpperCase()} • Source Language
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {preferences.defaultSourceLanguage !== langCode && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDefaultLanguage(langCode, "source")
                            }
                            className="hover:bg-gradient-to-r hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-300/50 hover:border-yellow-400"
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            removeFavoriteLanguage(langCode, "source")
                          }
                          className="hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 text-red-600 dark:text-red-400 border border-red-300/50 hover:border-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Language Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full font-mono py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-800/30 dark:hover:to-cyan-800/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() =>
                  setShowAddLanguage({ show: true, type: "source" })
                }
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Source Language
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Favorite Target Languages */}
        <Card className="hover:shadow-xl transition-all duration-500 bg-gradient-to-br from-green-500/5 via-emerald-400/5 to-teal-500/5 border-green-200/30 overflow-hidden backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border-b border-green-200/30">
            <CardTitle className="flex items-center space-x-4 font-mono">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-300/20">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <span className="text-xl bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                  Target Languages
                </span>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs bg-green-100 dark:bg-green-900/30"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    {preferences?.favoriteTargetLanguages?.length || 0}{" "}
                    favorites
                  </Badge>
                  {preferences?.defaultTargetLanguage && (
                    <Badge
                      variant="outline"
                      className="font-mono text-xs bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-600"
                    >
                      <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                      {getLanguageName(preferences.defaultTargetLanguage)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <AnimatePresence>
              {preferences?.favoriteTargetLanguages?.map((langCode, index) => (
                <motion.div
                  key={langCode}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="group relative bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/40 dark:border-green-700/40 rounded-2xl p-5 hover:from-green-100/90 hover:to-emerald-100/90 dark:hover:from-green-800/30 dark:hover:to-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <motion.span
                          className="text-4xl drop-shadow-sm"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {getLanguageFlag(langCode)}
                        </motion.span>
                        {preferences.defaultTargetLanguage === langCode && (
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.3,
                              type: "spring",
                              stiffness: 300,
                            }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold font-mono text-gray-900 dark:text-white text-lg">
                          {getLanguageName(langCode)}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400 font-mono font-medium">
                          {langCode.toUpperCase()} • Target Language
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {preferences.defaultTargetLanguage !== langCode && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDefaultLanguage(langCode, "target")
                            }
                            className="hover:bg-gradient-to-r hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-300/50 hover:border-yellow-400"
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            removeFavoriteLanguage(langCode, "target")
                          }
                          className="hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 text-red-600 dark:text-red-400 border border-red-300/50 hover:border-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Language Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full font-mono py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-800/30 dark:hover:to-emerald-800/30 border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() =>
                  setShowAddLanguage({ show: true, type: "target" })
                }
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Target Language
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Add Language Modal */}
      <AnimatePresence>
        {showAddLanguage.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddLanguage({ show: false, type: "source" });
              setLanguageSearchTerm("");
              setSelectedCategory("all");
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Header */}
              <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-blue-600/20 border-b border-border/50 p-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-300/30"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Languages className="w-8 h-8 text-purple-600" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold font-mono bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Add{" "}
                        {showAddLanguage.type === "source"
                          ? "Source"
                          : "Target"}{" "}
                        Language
                      </h3>
                      <p className="text-muted-foreground font-mono mt-1 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Choose from our curated collection of languages
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => {
                      setShowAddLanguage({ show: false, type: "source" });
                      setLanguageSearchTerm("");
                      setSelectedCategory("all");
                    }}
                    className="p-3 rounded-xl hover:bg-background/80 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>

              {/* Enhanced Search and Filter */}
              <div className="p-8 border-b border-border/50 bg-muted/30">
                <div className="space-y-6">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by language name, region, or code..."
                      value={languageSearchTerm}
                      onChange={(e) => setLanguageSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-background/70 backdrop-blur-sm border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 font-mono text-lg placeholder:text-muted-foreground/70 transition-all duration-300"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-3">
                    {["all", "Popular", "Asian", "European"].map((category) => {
                      const isSelected = selectedCategory === category;
                      return (
                        <motion.button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-6 py-3 rounded-xl font-mono font-medium transition-all duration-300 ${
                            isSelected
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                              : "bg-background/50 hover:bg-background/80 border border-border/50 hover:border-purple-300/50"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {category === "all" ? (
                            <span className="flex items-center">
                              <Filter className="w-4 h-4 mr-2" />
                              All Languages
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <span className="mr-2">
                                {
                                  availableLanguages.find(
                                    (cat) => cat.category === category
                                  )?.icon
                                }
                              </span>
                              {category}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Enhanced Language List */}
              <div className="max-h-96 overflow-y-auto p-8">
                <div className="space-y-8">
                  {filteredLanguages.map((category, categoryIndex) => (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: categoryIndex * 0.1 }}
                    >
                      <div className="mb-6">
                        <h4 className="text-lg font-bold text-foreground font-mono mb-2 flex items-center">
                          <span className="text-2xl mr-3">{category.icon}</span>
                          {category.category} Languages
                        </h4>
                        <p className="text-sm text-muted-foreground font-mono">
                          {category.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.languages.map((lang, langIndex) => {
                          const isAlreadyAdded =
                            showAddLanguage.type === "source"
                              ? preferences?.favoriteSourceLanguages?.includes(
                                  lang.code
                                )
                              : preferences?.favoriteTargetLanguages?.includes(
                                  lang.code
                                );

                          return (
                            <motion.button
                              key={lang.code}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: langIndex * 0.05 }}
                              onClick={() =>
                                !isAlreadyAdded &&
                                addFavoriteLanguage(
                                  lang.code,
                                  showAddLanguage.type
                                )
                              }
                              disabled={isAlreadyAdded}
                              onMouseEnter={() => setHoveredLanguage(lang.code)}
                              onMouseLeave={() => setHoveredLanguage(null)}
                              className={`relative w-full flex items-center space-x-4 p-5 rounded-2xl transition-all duration-300 font-mono border ${
                                isAlreadyAdded
                                  ? "bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-not-allowed border-green-200 dark:border-green-800"
                                  : "bg-background/50 hover:bg-background/80 border-border/50 hover:border-purple-300/50 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
                              }`}
                              whileHover={
                                !isAlreadyAdded ? { scale: 1.02, y: -2 } : {}
                              }
                              whileTap={!isAlreadyAdded ? { scale: 0.98 } : {}}
                            >
                              <motion.span
                                className="text-3xl"
                                animate={{
                                  scale:
                                    hoveredLanguage === lang.code ? 1.2 : 1,
                                  rotate:
                                    hoveredLanguage === lang.code ? 10 : 0,
                                }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                {lang.flag}
                              </motion.span>
                              <div className="text-left flex-1">
                                <p className="font-bold text-foreground text-lg">
                                  {lang.name}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{lang.region}</span>
                                  <span>•</span>
                                  <span>{lang.speakers} speakers</span>
                                </div>
                              </div>
                              {isAlreadyAdded && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center space-x-2"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Added
                                  </Badge>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredLanguages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-mono text-muted-foreground mb-2">
                      No languages found
                    </p>
                    <p className="text-sm font-mono text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Language Statistics */}
      <Card className="hover:shadow-xl transition-all duration-500 bg-gradient-to-br from-purple-500/5 via-pink-400/5 to-indigo-500/5 border-purple-200/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3 font-mono">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-300/20">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Language Usage Statistics
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border border-blue-200/30"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Languages className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-foreground font-mono mb-2">
                {analytics?.totalTranslations || 0}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                Total Translations
              </p>
            </motion.div>

            <motion.div
              className="text-center p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl border border-green-200/30"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-foreground font-mono mb-2">
                {languageStats.sourceLanguagesCount}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                Source Languages
              </p>
            </motion.div>

            <motion.div
              className="text-center p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-200/30"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-foreground font-mono mb-2">
                {languageStats.targetLanguagesCount}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                Target Languages
              </p>
            </motion.div>

            <motion.div
              className="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border border-orange-200/30"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-foreground font-mono mb-2">
                {languageStats.dailyAverage}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                Avg. Daily
              </p>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LanguagesManager;
