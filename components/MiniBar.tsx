import React, { useState, useRef } from "react";
import { Volume2, Languages, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MiniBarProps {
  onSelect: (id: string) => void;
  minimized: boolean;
  setMinimized: (min: boolean) => void;
}

const navItems = [
  {
    id: "main",
    label: "Audio",
    icon: Volume2,
  },
  {
    id: "translate",
    label: "Text",
    icon: Languages,
  },
  {
    id: "speech",
    label: "File",
    icon: FileText,
  },
];

const MiniBar: React.FC<MiniBarProps> = ({
  onSelect,
  minimized,
  setMinimized,
}) => {
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragStart.current = null;
    document.body.style.userSelect = "";
  };

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line
  }, [dragging]);

  if (!minimized) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        minWidth: 0,
      }}
      className="shadow-2xl"
    >
      <Card className="rounded-xl bg-background border-border border w-56">
        <CardContent className="p-2 flex flex-col gap-2">
          <div
            className="flex items-center justify-between cursor-move select-none mb-2"
            onMouseDown={handleMouseDown}
            style={{ cursor: "grab" }}
          >
            <span className="font-bold text-lg text-gradient bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              PiP
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMinimized(false)}
              aria-label="Close MiniBar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="outline"
                  size="icon"
                  className="flex flex-col items-center justify-center w-14 h-14"
                  onClick={() => {
                    setMinimized(false);
                    onSelect(item.id);
                  }}
                  aria-label={item.label}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MiniBar;
