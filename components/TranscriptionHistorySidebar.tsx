import React, { useEffect, useState } from "react";
import {
  FileText,
  Volume2,
  Image as ImageIcon,
  Type,
  Trash2,
  Loader2,
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
};

const TranscriptionHistorySidebar: React.FC<
  TranscriptionHistorySidebarProps
> = ({ height = "100%", onClose }) => {
  const [history, setHistory] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transcription");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data);
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

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <aside
      className="sidebar-scroll w-80 max-w-full bg-gradient-to-b from-background to-muted/60 border-r border-border p-0 overflow-y-auto flex flex-col shadow-2xl"
      style={{ height }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-background/80 sticky top-0 z-10">
        <h2 className="text-xl font-mono  font-bold tracking-tight flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-500" />
          History
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="text-xs font-mono px-2 py-1 rounded bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 border border-border flex items-center gap-1 text-white shadow-sm transition-colors duration-200"
            title="Refresh history"
            style={{ minWidth: 80 }}
          >
            <Loader2
              className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`}
            />
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
        {loading && (
          <div className="flex items-center justify-center text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        )}
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
