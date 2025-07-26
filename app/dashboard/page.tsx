"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Languages,
  BarChart3,
  Settings,
  Activity,
  FileText,
  Volume2,
  Calendar,
  Moon,
  Sun,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import AnalyticsAndCosts from "@/components/dashboard/AnalyticsAndCosts";
import LanguagesAndHistory from "@/components/dashboard/LanguagesAndHistory";

interface UserPreferences {
  favoriteSourceLanguages: string[];
  favoriteTargetLanguages: string[];
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  theme: string;
  notificationsEnabled: boolean;
  autoSaveEnabled: boolean;
}

interface Analytics {
  totalTranslations: number;
  totalWords: number;
  totalCharacters: number;
  averageWordsPerTranslation: number;
  period: string;
  analytics: {
    date: string;
    translations: number;
    words: number;
    characters: number;
  }[];
  recentTranslations: {
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
  }[];
}

interface CostData {
  date: string;
  cost: number;
  usage: number;
}

interface ProviderStats {
  totalCost: number;
  totalUsage: number;
  serviceTypes: string[];
}

interface ServiceStats {
  totalCost: number;
  totalUsage: number;
  serviceType: string;
}

interface CostTracking {
  totalCost: number;
  totalUsage: number;
  period: string;
  costData: CostData[];
  providerStats: Record<string, ProviderStats>;
  serviceStats: Record<string, ServiceStats>;
  averageCostPerDay: number;
}

const Dashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [costTracking, setCostTracking] = useState<CostTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);

    // Load dashboard data
    loadDashboardData();
  }, [session, status, router]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user preferences
      const prefsResponse = await fetch("/api/user/preferences");
      if (prefsResponse.ok) {
        const prefs = await prefsResponse.json();
        setPreferences(prefs);
      }

      // Load analytics
      const analyticsResponse = await fetch("/api/user/analytics?period=30");
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

      // Load cost tracking
      const costResponse = await fetch("/api/user/cost-tracking?period=30");
      if (costResponse.ok) {
        const costData = await costResponse.json();
        setCostTracking(costData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const updatePreferences = async (
    newPreferences: Partial<UserPreferences>
  ) => {
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, ...newPreferences }),
      });

      if (response.ok) {
        const updatedPrefs = await response.json();
        setPreferences(updatedPrefs);
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-mono">
            Loading your personalized dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name || "User";

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "languages", label: "Languages & History", icon: Languages },
    { id: "analytics", label: "Analytics & Costs", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader theme={theme} toggleTheme={toggleTheme} />

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors font-mono ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2 font-mono">
                    Welcome back, {userName}! 👋
                  </h2>
                  <p className="text-muted-foreground font-mono">
                    Here&apos;s your translation activity overview and
                    personalized insights.
                  </p>
                </div>
                <div className="hidden lg:flex items-center space-x-2">
                  <Badge variant="secondary" className="font-mono">
                    <Activity className="w-3 h-3 mr-1" />
                    Active Session
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground font-mono">
                        Total Translations
                      </p>
                      <p className="text-2xl font-bold text-foreground font-mono">
                        {analytics?.totalTranslations || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Languages className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground font-mono">
                        Words Translated
                      </p>
                      <p className="text-2xl font-bold text-foreground font-mono">
                        {analytics?.totalWords?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground font-mono">
                        Characters
                      </p>
                      <p className="text-2xl font-bold text-foreground font-mono">
                        {analytics?.totalCharacters?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground font-mono">
                        Total Cost
                      </p>
                      <p className="text-2xl font-bold text-foreground font-mono">
                        ${costTracking?.totalCost?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity
                translations={analytics?.recentTranslations || []}
              />
              <QuickActions
                onLanguageManage={() => setActiveTab("languages")}
              />
            </div>
          </div>
        )}

        {activeTab === "languages" && (
          <LanguagesAndHistory
            translations={analytics?.recentTranslations || []}
            preferences={preferences}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onUpdatePreferences={updatePreferences}
            analytics={analytics}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsAndCosts
            analytics={analytics}
            costTracking={costTracking}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-mono">
                Settings
              </h2>
              <p className="text-muted-foreground font-mono">
                Customize your dashboard and preferences
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="font-mono">Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium font-mono">Theme</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Choose your preferred theme
                      </p>
                    </div>
                    <Button
                      onClick={toggleTheme}
                      variant="outline"
                      className="w-32 font-mono"
                    >
                      {theme === "dark" ? (
                        <>
                          <Moon className="w-4 h-4 mr-2" />
                          Dark
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4 mr-2" />
                          Light
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="font-mono">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium font-mono">
                        Email Notifications
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Receive updates via email
                      </p>
                    </div>
                    <Button
                      variant={
                        preferences?.notificationsEnabled
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updatePreferences({
                          notificationsEnabled:
                            !preferences?.notificationsEnabled,
                        })
                      }
                      className="font-mono"
                    >
                      {preferences?.notificationsEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium font-mono">Auto Save</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Automatically save translations
                      </p>
                    </div>
                    <Button
                      variant={
                        preferences?.autoSaveEnabled ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updatePreferences({
                          autoSaveEnabled: !preferences?.autoSaveEnabled,
                        })
                      }
                      className="font-mono"
                    >
                      {preferences?.autoSaveEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
