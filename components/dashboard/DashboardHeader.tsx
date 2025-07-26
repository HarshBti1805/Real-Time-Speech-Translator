"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Sparkles, Moon, Sun, Globe } from "lucide-react";

interface DashboardHeaderProps {
  theme: string;
  toggleTheme: () => void;
}

const DashboardHeader = ({ theme, toggleTheme }: DashboardHeaderProps) => {
  const { data: session } = useSession();
  const router = useRouter();

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-mono bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TranslateHub
              </h1>
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <Badge variant="secondary" className="ml-2 font-mono">
              Dashboard
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="hidden sm:flex font-mono"
            >
              <Globe className="w-4 h-4 mr-2" />
              Back to App
            </Button>

            <div className="flex items-center space-x-3 bg-muted/60 border border-border rounded-xl px-3 py-2">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName}
                  className="h-8 w-8 rounded-full border border-border shadow object-cover"
                  width={32}
                  height={32}
                  priority={true}
                />
              ) : (
                <div className="h-8 w-8 font-mono rounded-full shadow flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-sm">
                  {userName[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="font-medium text-foreground text-sm font-mono">
                  {userName}
                </p>
                <p className="text-muted-foreground text-xs font-mono">
                  {userEmail}
                </p>
              </div>
            </div>

            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Sign Out button from main page */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 border border-indigo-600 text-xs lg:text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-mono"
              title="Sign out of your account"
            >
              <svg
                className="w-3 h-3 lg:w-4 lg:h-4 mr-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                />
              </svg>
              <span className="hidden xl:inline">Sign Out</span>
              <span className="xl:hidden">Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
