import React, { useEffect, useState } from "react";
import {
  FileText,
  Volume2,
  Image as ImageIcon,
  Type,
  Video,
  Trash2,
  Copy as CopyIcon,
  Check as CheckIcon,
  RefreshCw,
  X,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import toast from "react-hot-toast";

interface Transcription {
  id: string;
  inputType: string;
  inputValue: string;
  outputValue: string;
  createdAt: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "audio":
      return <Volume2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
    case "file":
      return (
        <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
      );
    case "video":
      return <Video className="w-4 h-4 text-red-500 dark:text-red-400" />;
    case "image":
      return (
        <ImageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
      );
    case "text":
      return <Type className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    default:
      return <Type className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  }
};

const typeGradient = (type: string) => {
  switch (type) {
    case "audio":
      return "from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20";
    case "file":
      return "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20";
    case "video":
      return "from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20";
    case "image":
      return "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20";
    case "text":
      return "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20";
    default:
      return "from-gray-500/10 to-slate-500/10 dark:from-gray-500/20 dark:to-slate-500/20";
  }
};

type TranscriptionHistorySidebarProps = {
  height?: string | number;
  onClose?: () => void;
  open?: boolean;
};

const TranscriptionHistorySidebar: React.FC<
  TranscriptionHistorySidebarProps
> = ({ height = "100%", onClose, open = true }) => {
  const [history, setHistory] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-animate for list animations
  const [parent] = useAutoAnimate();

  // Motion values for interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transcription");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data);
      setLastUpdateTime(new Date());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error("Failed to fetch history");
      } else {
        setError("Unknown error");
        toast.error("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Efficient polling fallback for production environments
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const since = lastUpdateTime?.toISOString();
        const url = since
          ? `/api/transcription/check-updates?since=${encodeURIComponent(
              since
            )}`
          : "/api/transcription/check-updates";

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();

          if (data.hasUpdates && data.transcriptions.length > 0) {
            fetchHistory();
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        fetchHistory();
      }
    }, 15000);

    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
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
        setHistory((prev) => prev.filter((item) => item.id !== id));
        toast.success("Transcription deleted successfully!");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete transcription");
        toast.error("Failed to delete transcription");
      }
    } catch {
      setError("Failed to delete transcription");
      toast.error("Failed to delete transcription");
    }
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // SSE connection setup with production fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const isProduction =
      process.env.NODE_ENV === "production" ||
      window.location.hostname.includes("vercel.app");

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/transcription/stream");

        eventSource.onopen = () => {
          console.log("SSE connection established");
          reconnectAttempts = 0;
          stopPolling();
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case "connected":
                console.log("SSE connected:", data.message);
                break;
              case "new_transcription":
                console.log("New transcription received:", data.data);
                setHistory((prev) => [data.data, ...prev]);
                setLastUpdateTime(new Date());
                toast.success("New transcription added!", {
                  icon: (
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                  ),
                });
                break;
              case "transcription_deleted":
                console.log("Transcription deleted:", data.data.id);
                setHistory((prev) =>
                  prev.filter((item) => item.id !== data.data.id)
                );
                setLastUpdateTime(new Date());
                break;
              default:
                console.log("Unknown SSE event type:", data.type);
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts) * 1000;
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              if (eventSource) {
                eventSource.close();
                connectSSE();
              }
            }, delay);
          } else {
            console.log(
              "SSE failed after max attempts, falling back to polling"
            );
            toast.error("Real-time updates disconnected", {
              icon: (
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              ),
            });
            startPolling();
          }
        };
      } catch (error) {
        console.error("Failed to establish SSE connection:", error);
        startPolling();
      }
    };

    fetchHistory();

    if (isProduction) {
      startPolling();
      setTimeout(() => connectSSE(), 1000);
    } else {
      connectSSE();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      stopPolling();
    };
  }, []);

  // Mouse move handler for interactive effects
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  return (
    <>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: -280 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
            duration: 0.3,
          }}
          className="sidebar-scroll w-full max-w-full bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 p-0 overflow-y-auto flex flex-col shadow-2xl transition-all duration-500 ease-in-out relative"
          style={{ height }}
          onMouseMove={handleMouseMove}
        >
          {/* Animated background with particles effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-950 dark:to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.08),transparent_50%)]" />

          {/* Header with glassmorphism effect */}
          <motion.div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/90 backdrop-blur-xl sticky top-0 z-10 relative"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            <motion.h2
              className="text-xl font-bold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div
                className="relative"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Sparkles className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full"
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
              </motion.div>
              <span className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text font-mono text-transparent">
                History
              </span>
            </motion.h2>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs font-mono font-medium px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20 hover:from-cyan-500/20 hover:via-blue-500/20 hover:to-purple-500/20 dark:hover:from-cyan-400/30 dark:hover:via-blue-400/30 dark:hover:to-purple-400/30 border border-cyan-500/30 dark:border-cyan-400/40 flex items-center gap-2 text-cyan-600 dark:text-cyan-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                whileHover={{
                  scale: isRefreshing ? 1 : 1.05,
                  boxShadow: isRefreshing
                    ? "0 0 0 rgba(6, 182, 212, 0)"
                    : "0 10px 25px rgba(6, 182, 212, 0.2)",
                }}
                whileTap={{ scale: 0.95 }}
                style={{ minWidth: 90 }}
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
                  {isRefreshing ? "..." : "Refresh"}
                </span>
              </motion.button>
              {onClose && (
                <motion.button
                  onClick={onClose}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  title="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Content area */}
          <div className="flex-1 px-3 py-4 space-y-3 relative" ref={parent}>
            <AnimatePresence>
              {error && (
                <motion.div
                  className="text-sm text-red-600 dark:text-red-400 px-4 py-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {history.length === 0 && !loading && !error && (
              <motion.div
                className="text-sm text-gray-500 dark:text-gray-400 text-center py-16"
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
                  className="mb-6"
                >
                  <div className="relative">
                    <Sparkles className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
                    <motion.div
                      className="absolute inset-0 w-16 h-16 mx-auto"
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
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    No history yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Start translating to see your history here
                  </p>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{
                    delay: index * 0.02,
                    type: "tween",
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -4,
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative bg-white/80 dark:bg-black/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl backdrop-blur-md px-5 py-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                    expandedId === item.id
                      ? "ring-2 ring-cyan-500/50 shadow-cyan-500/20"
                      : ""
                  }`}
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedId === item.id}
                >
                  {/* Hover effect overlay */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${typeGradient(
                      item.inputType
                    )} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    initial={false}
                  />
                  {/* Enhanced hover glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    initial={false}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {typeIcon(item.inputType)}
                      </motion.div>
                      <motion.span
                        className="text-[13px] font-semibold uppercase tracking-wide bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 dark:from-pink-400 dark:via-rose-400 dark:to-purple-400 bg-clip-text text-transparent"
                        whileHover={{
                          scale: 1.05,
                          filter: "brightness(1.2)",
                        }}
                        animate={{
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }}
                        transition={{
                          backgroundPosition: {
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                          scale: {
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          },
                        }}
                        style={{
                          backgroundSize: "200% 200%",
                        }}
                      >
                        {item.inputType}
                      </motion.span>
                      <div className="flex items-center gap-1 ml-auto text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="block text-sm font-semibold truncate max-w-[160px] text-gray-900 dark:text-white"
                        title={item.inputValue}
                      >
                        {item.inputValue}
                      </span>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="ml-auto cursor-pointer text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg transition-all duration-300 opacity-70 hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete transcription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>

                    <div
                      className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-full"
                      title={item.outputValue}
                    >
                      {expandedId === item.id ? (
                        <motion.div
                          className="relative"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className="block cursor-text whitespace-pre-line bg-gray-50 dark:bg-black/60 rounded-xl p-4 mt-3 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 pr-12 select-text backdrop-blur-sm"
                            style={{ userSelect: "text" }}
                          >
                            {item.outputValue}
                          </span>
                          <motion.button
                            className="absolute cursor-pointer top-4 right-4 p-2 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/20 transition-all duration-300 text-gray-400 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none backdrop-blur-sm"
                            title="Copy to clipboard"
                            onClick={() =>
                              handleCopy(item.id, item.outputValue)
                            }
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <AnimatePresence mode="wait">
                              {copiedId === item.id ? (
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
                                  <CheckIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
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
                                  <CopyIcon className="w-4 h-4" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </motion.div>
                      ) : item.outputValue.length > 60 ? (
                        item.outputValue.slice(0, 60) + "..."
                      ) : (
                        item.outputValue
                      )}
                    </div>

                    {expandedId === item.id && (
                      <motion.div
                        className="text-right mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                      >
                        <span className="text-xs cursor-pointer text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-colors duration-200">
                          Click to collapse
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </>
  );
};

export default TranscriptionHistorySidebar;
