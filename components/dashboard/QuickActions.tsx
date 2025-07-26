"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Zap,
  Mic,
  Languages,
  FileText,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface QuickActionsProps {
  onLanguageManage: () => void;
}

const QuickActions = ({ onLanguageManage }: QuickActionsProps) => {
  const router = useRouter();

  const actions = [
    {
      icon: Mic,
      label: "Voice Translate",
      description: "Real-time speech translation",
      onClick: () => router.push("/"),
      gradient: "from-blue-500 via-cyan-500 to-blue-600",
      bgGradient: "from-blue-500/10 via-cyan-500/10 to-blue-600/10",
      borderColor: "border-blue-500/20",
      hoverShadow: "hover:shadow-blue-500/25",
      stats: "Live AI",
    },
    {
      icon: Languages,
      label: "Text Translate",
      description: "Multi-language text translation",
      onClick: () => router.push("/?tab=translate"),
      gradient: "from-purple-500 via-pink-500 to-purple-600",
      bgGradient: "from-purple-500/10 via-pink-500/10 to-purple-600/10",
      borderColor: "border-purple-500/20",
      hoverShadow: "hover:shadow-purple-500/25",
      stats: "100+ Languages",
    },
    {
      icon: FileText,
      label: "File to Text",
      description: "Convert audio files to text",
      onClick: () => router.push("/?tab=speech"),
      gradient: "from-green-500 via-emerald-500 to-green-600",
      bgGradient: "from-green-500/10 via-emerald-500/10 to-green-600/10",
      borderColor: "border-green-500/20",
      hoverShadow: "hover:shadow-green-500/25",
      stats: "OCR Ready",
    },
    {
      icon: Star,
      label: "Manage Languages",
      description: "Customize your preferences",
      onClick: onLanguageManage,
      gradient: "from-orange-500 via-red-500 to-orange-600",
      bgGradient: "from-orange-500/10 via-red-500/10 to-orange-600/10",
      borderColor: "border-orange-500/20",
      hoverShadow: "hover:shadow-orange-500/25",
      stats: "Personalized",
    },
  ];

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-black/50 border border-gray-200/50 dark:border-gray-800/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 font-mono text-lg">
          <div className="relative">
            <Zap className="w-6 h-6 text-yellow-500" />
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Quick Actions
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: index * 0.1,
                duration: 0.4,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.02,
                y: -4,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
              className="group relative"
            >
              <div
                className={`relative overflow-hidden rounded-xl border ${action.borderColor} bg-gradient-to-br ${action.bgGradient} p-4 transition-all duration-300 cursor-pointer group-hover:shadow-lg ${action.hoverShadow} backdrop-blur-sm`}
                onClick={action.onClick}
              >
                {/* Animated background gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  initial={false}
                />

                {/* Sparkle effect */}
                <motion.div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                >
                  <Sparkles className="w-4 h-4 text-white/60" />
                </motion.div>

                <div className="relative z-10 space-y-3">
                  {/* Icon */}
                  <motion.div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg`}
                    whileHover={{
                      scale: 1.1,
                      rotate: 5,
                      transition: { type: "spring", stiffness: 400 },
                    }}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white font-mono text-sm">
                      {action.label}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono leading-relaxed">
                      {action.description}
                    </p>
                  </div>

                  {/* Stats badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">
                      {action.stats}
                    </span>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={false}
                      whileHover={{ x: 2 }}
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </motion.div>
                  </div>
                </div>

                {/* Hover glow effect */}
                <motion.div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500`}
                  initial={false}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick stats preview */}
        <motion.div
          className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 font-mono">
                All services active
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
              Ready to translate
            </span>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
