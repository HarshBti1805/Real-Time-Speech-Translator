"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Languages,
  Volume2,
  FileText,
  Image as ImageIcon,
  Type,
  Copy as CopyIcon,
  Check as CheckIcon,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

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

interface RecentActivityProps {
  translations: Translation[];
}

const typeIcon = (type: string) => {
  switch (type) {
    case "audio":
      return <Volume2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
    case "file":
      return (
        <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
      );
    case "image":
      return (
        <ImageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
      );
    case "text":
      return <Type className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    default:
      return <Languages className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
  }
};

const typeGradient = (type: string) => {
  switch (type) {
    case "audio":
      return "from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20";
    case "file":
      return "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20";
    case "image":
      return "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20";
    case "text":
      return "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20";
    default:
      return "from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20";
  }
};

const RecentActivity = ({ translations }: RecentActivityProps) => {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/transcription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Translation deleted successfully!");
        // You might want to refresh the data here
      } else {
        toast.error("Failed to delete translation");
      }
    } catch {
      toast.error("Failed to delete translation");
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 font-mono">
          <Clock className="w-5 h-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {translations?.length ? (
          <div className="space-y-3">
            <AnimatePresence>
              {translations.slice(0, 5).map((translation, index) => (
                <motion.div
                  key={translation.id || index}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{
                    delay: index * 0.05,
                    type: "tween",
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -2,
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative bg-white/80 dark:bg-black/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg backdrop-blur-md p-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                    expandedId === translation.id
                      ? "ring-2 ring-cyan-500/50 shadow-cyan-500/20"
                      : ""
                  }`}
                  onClick={() =>
                    setExpandedId(
                      expandedId === translation.id ? null : translation.id
                    )
                  }
                >
                  {/* Hover effect overlay */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${typeGradient(
                      translation.inputType || "translation"
                    )} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    initial={false}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {typeIcon(translation.inputType || "translation")}
                      </motion.div>
                      <motion.span
                        className="text-[12px] font-semibold uppercase tracking-wide bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 dark:from-pink-400 dark:via-rose-400 dark:to-purple-400 bg-clip-text text-transparent font-mono"
                        whileHover={{
                          scale: 1.05,
                          filter: "brightness(1.2)",
                        }}
                      >
                        {translation.inputType || "translation"}
                      </motion.span>
                      <div className="flex items-center gap-1 ml-auto text-xs text-gray-400 dark:text-gray-500 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(
                          translation.date ||
                            translation.createdAt ||
                            Date.now()
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="block text-sm font-semibold truncate max-w-[200px] text-gray-900 dark:text-white font-mono"
                        title={
                          translation.sourceText ||
                          translation.inputValue ||
                          "Source text"
                        }
                      >
                        {translation.sourceText ||
                          translation.inputValue ||
                          "Source text"}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(
                              translation.id || index.toString(),
                              translation.translatedText ||
                                translation.outputValue ||
                                ""
                            );
                          }}
                          className="cursor-pointer text-gray-400 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 p-1.5 rounded-lg transition-all duration-300 opacity-70 hover:opacity-100 hover:bg-cyan-50 dark:hover:bg-cyan-500/10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Copy translation"
                        >
                          <AnimatePresence mode="wait">
                            {copiedId ===
                            (translation.id || index.toString()) ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                }}
                              >
                                <CheckIcon className="w-3 h-3 text-green-500 dark:text-green-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                }}
                              >
                                <CopyIcon className="w-3 h-3" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(translation.id || index.toString());
                          }}
                          className="cursor-pointer text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-all duration-300 opacity-70 hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete translation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>

                    <div
                      className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-full font-mono"
                      title={
                        translation.translatedText ||
                        translation.outputValue ||
                        "Translated text"
                      }
                    >
                      {expandedId === translation.id ? (
                        <motion.div
                          className="relative"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className="block cursor-text whitespace-pre-line bg-gray-50 dark:bg-black/60 rounded-xl p-3 mt-2 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 pr-12 select-text backdrop-blur-sm font-mono"
                            style={{ userSelect: "text" }}
                          >
                            {translation.translatedText ||
                              translation.outputValue ||
                              "Translated text"}
                          </span>
                        </motion.div>
                      ) : (
                          translation.translatedText ||
                          translation.outputValue ||
                          ""
                        ).length > 50 ? (
                        (
                          translation.translatedText ||
                          translation.outputValue ||
                          ""
                        ).slice(0, 50) + "..."
                      ) : (
                        translation.translatedText ||
                        translation.outputValue ||
                        "Translated text"
                      )}
                    </div>

                    {expandedId === translation.id && (
                      <motion.div
                        className="text-right mt-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                      >
                        <span className="text-xs cursor-pointer text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-colors duration-200 font-mono">
                          Click to collapse
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            className="text-center py-8 text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mb-4"
            >
              <div className="relative">
                <Sparkles className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
                <motion.div
                  className="absolute inset-0 w-12 h-12 mx-auto"
                  animate={{
                    background: [
                      "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)",
                      "radial-gradient(circle, rgba(147,51,234,0.05) 0%, transparent 70%)",
                      "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)",
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>
            <p className="font-mono mb-2">No recent translations</p>
            <Button onClick={() => router.push("/")} className="mt-2 font-mono">
              Start Translating
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
