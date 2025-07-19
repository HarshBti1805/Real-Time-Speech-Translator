import React, { useEffect, useState } from "react";
import {
  FileText,
  Volume2,
  Image as ImageIcon,
  Type,
  Trash2,
  // Loader2,
  Copy as CopyIcon,
  Check as CheckIcon,
} from "lucide-react";

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
      return <Volume2 className="w-4 h-4 text-blue-500" />;
    case "file":
      return <FileText className="w-4 h-4 text-purple-500" />;
    case "image":
      return <ImageIcon className="w-4 h-4 text-green-500" />;
    case "text":
      return <Type className="w-4 h-4 text-yellow-500" />;
    default:
      return <Type className="w-4 h-4 text-muted-foreground" />;
  }
};

type TranscriptionHistorySidebarProps = {
  height?: string | number; // e.g., '400px', '100%', 400
  onClose?: () => void;
  open?: boolean; // new prop to control open/close
};

const TranscriptionHistorySidebar: React.FC<
  TranscriptionHistorySidebarProps
> = ({ height = "100%", onClose, open = true }) => {
  const [history, setHistory] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

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
      } else {
        setError("Unknown error");
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
            // Only fetch full history if there are updates
            fetchHistory();
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Fall back to full fetch on error
        fetchHistory();
      }
    }, 15000); // Poll every 15 seconds

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
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete transcription");
      }
    } catch {
      setError("Failed to delete transcription");
    }
  };

  // Copy to clipboard handler
  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // Optionally handle error
    }
  };

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchHistory();
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, []);

  // SSE connection setup with production fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    // Detect if we're in production (Vercel)
    const isProduction =
      process.env.NODE_ENV === "production" ||
      window.location.hostname.includes("vercel.app");

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/transcription/stream");

        eventSource.onopen = () => {
          console.log("SSE connection established");
          setSseConnected(true);
          reconnectAttempts = 0;
          stopPolling(); // Stop polling when SSE is working
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
          setSseConnected(false);

          // Clear any existing reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts) * 1000; // 1s, 2s, 4s
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              if (eventSource) {
                eventSource.close();
                connectSSE();
              }
            }, delay);
          } else {
            // Fall back to polling after max attempts
            console.log(
              "SSE failed after max attempts, falling back to polling"
            );
            startPolling();
          }
        };
      } catch (error) {
        console.error("Failed to establish SSE connection:", error);
        setSseConnected(false);
        // Fall back to polling immediately on connection failure
        startPolling();
      }
    };

    // Initial fetch and connection strategy
    fetchHistory();

    // Use different strategies based on environment
    if (isProduction) {
      // In production, start with polling and try SSE as backup
      startPolling();
      // Still try SSE but with lower expectations
      setTimeout(() => connectSSE(), 1000);
    } else {
      // In development, prefer SSE
      connectSSE();
    }

    // Cleanup on unmount
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

  return (
    <aside
      className={`sidebar-scroll w-80 max-w-full bg-gradient-to-b from-background to-muted/60 border-r border-border p-0 overflow-y-auto flex flex-col shadow-2xl transition-all duration-500 ease-in-out
        ${
          open
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full pointer-events-none"
        }
      `}
      style={{ height }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-background/80 sticky top-0 z-10">
        <h2 className="text-xl font-mono  font-bold tracking-tight flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-500" />
          History
          <div
            className={`w-2 h-2 rounded-full ${
              sseConnected ? "bg-green-500" : "bg-red-500"
            }`}
            title={
              sseConnected
                ? "Real-time updates connected"
                : "Real-time updates disconnected"
            }
          />
          {lastUpdateTime && (
            <span className="text-xs text-muted-foreground ml-2">
              Last: {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="text-xs font-mono px-2 py-1 rounded bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 border border-border flex items-center gap-1 text-white shadow-sm transition-colors duration-200"
            title="Refresh history"
            style={{ minWidth: 80 }}
          >
            {/* <Loader2
              className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`}
            /> */}
            Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent"
              title="Close sidebar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 px-2 py-2 space-y-3">
        {error && <div className="text-sm text-red-500 px-2">{error}</div>}
        {history.length === 0 && !loading && !error && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No history yet.
          </div>
        )}
        {history.map((item) => (
          <div
            key={item.id}
            className={`group relative bg-white/80 dark:bg-card border border-border rounded-xl shadow-sm px-4 py-3 transition-all duration-200 hover:shadow-lg   ${
              expandedId === item.id ? "ring-2 ring-blue-400" : ""
            }`}
            onClick={() =>
              setExpandedId(expandedId === item.id ? null : item.id)
            }
            tabIndex={0}
            role="button"
            aria-expanded={expandedId === item.id}
          >
            <div className="flex items-center gap-2 mb-1">
              {typeIcon(item.inputType)}
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                {item.inputType}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="block text-sm font-semibold truncate max-w-[140px]"
                title={item.inputValue}
              >
                {item.inputValue}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="ml-auto cursor-pointer text-muted-foreground hover:text-red-500 p-1 rounded transition-colors opacity-70 hover:opacity-100"
                title="Delete transcription"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div
              className="text-xs text-foreground/80 truncate max-w-full"
              title={item.outputValue}
            >
              {expandedId === item.id ? (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking inside
                >
                  <span
                    className="block cursor-text whitespace-pre-line bg-muted/60 rounded p-2 mt-1 text-sm text-foreground border border-border pr-8 select-text"
                    style={{ userSelect: "text" }}
                  >
                    {item.outputValue}
                  </span>
                  <button
                    className="absolute cursor-pointer top-2 right-2 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-blue-600 focus:outline-none"
                    title="Copy to clipboard"
                    onClick={() => handleCopy(item.id, item.outputValue)}
                  >
                    {copiedId === item.id ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : item.outputValue.length > 60 ? (
                item.outputValue.slice(0, 60) + "..."
              ) : (
                item.outputValue
              )}
            </div>
            {expandedId === item.id && (
              <div className="text-right mt-2">
                <span className="text-xs cursor-pointer text-muted-foreground hover:text-primary font-medium transition-colors duration-200">
                  Click to collapse
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default TranscriptionHistorySidebar;
