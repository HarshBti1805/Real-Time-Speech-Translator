import React, {
  useState,
  useRef,
  useEffect,
  MouseEvent,
  ChangeEvent,
} from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Download,
} from "lucide-react";

interface CustomAudioPlayerProps {
  audioUrl: string | null;
  isRecording: boolean;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  audioUrl,
  isRecording,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (audio && duration && isFinite(duration)) {
      const rect = (e.target as HTMLDivElement).getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * duration;
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (audio && duration && isFinite(duration)) {
      audio.currentTime = Math.max(
        0,
        Math.min(duration, audio.currentTime + seconds)
      );
    }
  };

  const formatTime = (time: number): string => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `recording-${new Date().toISOString().slice(0, 19)}.wav`;
    link.click();
  };

  if (!audioUrl || isRecording) return null;

  return (
    <div className="pt-4">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 shadow-lg border border-slate-200 dark:border-slate-700">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Progress Bar */}
        <div className="mb-4">
          <div
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-150 group-hover:from-blue-600 group-hover:to-purple-600"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              title="Skip back 10s"
              type="button"
            >
              <SkipBack size={16} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-md"
              title={isPlaying ? "Pause" : "Play"}
              type="button"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              title="Skip forward 10s"
              type="button"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                title="Volume"
                type="button"
              >
                <Volume2 size={16} />
              </button>

              {showVolumeSlider && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 border border-slate-200 dark:border-slate-700">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Download */}
            <button
              onClick={downloadAudio}
              className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              title="Download audio"
              type="button"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Waveform Visualization (Optional Enhancement) */}
        <div className="mt-3 h-6 flex items-end justify-center space-x-1">
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              className={`w-1 bg-slate-300 dark:bg-slate-600 rounded-full transition-all duration-150 ${
                i < (currentTime / duration) * 40 ? "bg-blue-500" : ""
              }`}
              style={{
                height: `${Math.random() * 20 + 4}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
