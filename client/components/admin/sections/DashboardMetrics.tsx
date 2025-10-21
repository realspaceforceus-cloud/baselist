import { useEffect, useState } from "react";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  Zap,
  BarChart3,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";

interface MetricsData {
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  failedTransactions: number;
  activeUsers: number;
  basesByUsers: Array<{ name: string; count: number }>;
  basesByListings: Array<{ name: string; count: number }>;
  basesBySignups: Array<{ name: string; count: number }>;
  openReports: number;
  flaggedContent: number;
  pendingVerifications: number;
  totalRevenue: number;
  completedTransactions: number;
  peakHour: number | null;
  peakDay: string | null;
  retentionRate: number;
}

const CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

function HorizontalBarChart({
  data,
  maxValue,
}: {
  data: Array<{ name: string; count: number }>;
  maxValue: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-6 w-full rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.count / maxValue) * 100}%`,
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const DashboardMetrics = () => {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "90d" | "all">(
    "7d",
  );
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [
        systemHealth,
        liveUsers,
        basesByUsers,
        basesByListings,
        basesBySignups,
        moderation,
        revenue,
        peakActivity,
        retention,
      ] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getLiveUsers(),
        adminApi.getBasesByUsers(period),
        adminApi.getBasesByListings(period),
        adminApi.getBasesBySignups(period),
        adminApi.getModerationMetrics(),
        adminApi.getRevenueMetrics(period),
        adminApi.getPeakActivity(),
        adminApi.getRetention(),
      ]);

      setMetrics({
        uptime: systemHealth.uptime,
        errorRate: systemHealth.errorRate,
        avgResponseTime: systemHealth.avgResponseTime,
        failedTransactions: systemHealth.failedTransactions,
        activeUsers: liveUsers.activeUsers,
        basesByUsers: basesByUsers.bases,
        basesByListings: basesByListings.bases,
        basesBySignups: basesBySignups.bases,
        openReports: moderation.openReports,
        flaggedContent: moderation.flaggedContent,
        pendingVerifications: moderation.pendingVerifications,
        totalRevenue: revenue.totalRevenue,
        completedTransactions: revenue.completedTransactions,
        peakHour: peakActivity.peakHour,
        peakDay: peakActivity.peakDay,
        retentionRate: retention.retentionRate,
      });
    } catch (error) {
      console.error("Failed to load metrics:", error);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [period]);

  // Poll for live users every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const liveUsers = await adminApi.getLiveUsers();
        setMetrics((prev) =>
          prev ? { ...prev, activeUsers: liveUsers.activeUsers } : null,
        );
      } catch (error) {
        console.error("Failed to update live users:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  const maxUsers = Math.max(
    ...(metrics.basesByUsers?.map((b) => b.count) || [1]),
  );
  const maxListings = Math.max(
    ...(metrics.basesByListings?.map((b) => b.count) || [1]),
  );
  const maxSignups = Math.max(
    ...(metrics.basesBySignups?.map((b) => b.count) || [1]),
  );

  return (
    <section className="space-y-6">
      {/* Time Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["24h", "7d", "30d", "90d", "all"] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
            className="rounded-lg"
          >
            {p === "24h"
              ? "Last 24h"
              : p === "7d"
                ? "Last 7 days"
                : p === "30d"
                  ? "Last 30 days"
                  : p === "90d"
                    ? "Last 90 days"
                    : "All-time"}
          </Button>
        ))}
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                API Uptime
              </p>
              <p className="text-3xl font-bold text-success">
                {metrics.uptime.toFixed(2)}%
              </p>
            </div>
            <Activity className="h-8 w-8 text-success/20" />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Error Rate
              </p>
              <p className="text-3xl font-bold text-warning">
                {metrics.errorRate.toFixed(2)}%
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-warning/20" />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Avg Response
              </p>
              <p className="text-3xl font-bold text-primary">
                {metrics.avgResponseTime}
                <span className="text-lg text-muted-foreground">ms</span>
              </p>
            </div>
            <Zap className="h-8 w-8 text-primary/20" />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Failed Transactions
              </p>
              <p className="text-3xl font-bold text-destructive">
                {metrics.failedTransactions}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-destructive/20" />
          </div>
        </div>
      </div>

      {/* Live Users Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Active Users (Right Now)
            </p>
            <p className="text-4xl font-bold text-foreground mt-2">
              {metrics.activeUsers}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Updated every 30 seconds
            </p>
          </div>
          <Users className="h-12 w-12 text-primary/20" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 5 Bases by Active Users */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Bases by Active Users
          </h3>
          {metrics.basesByUsers && metrics.basesByUsers.length > 0 ? (
            <HorizontalBarChart
              data={metrics.basesByUsers}
              maxValue={maxUsers}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </div>

        {/* Top 5 Bases by Active Listings */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Bases by Listings
          </h3>
          {metrics.basesByListings && metrics.basesByListings.length > 0 ? (
            <HorizontalBarChart
              data={metrics.basesByListings}
              maxValue={maxListings}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </div>

        {/* Top 5 Bases by Signups */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Bases by Signups
          </h3>
          {metrics.basesBySignups && metrics.basesBySignups.length > 0 ? (
            <HorizontalBarChart
              data={metrics.basesBySignups}
              maxValue={maxSignups}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* Moderation Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Open Reports
            </p>
            <p className="text-3xl font-bold text-warning">
              {metrics.openReports}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Flagged Content
            </p>
            <p className="text-3xl font-bold text-destructive">
              {metrics.flaggedContent}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pending Verifications
            </p>
            <p className="text-3xl font-bold text-primary">
              {metrics.pendingVerifications}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue & Activity Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="text-3xl font-bold text-success">
              ${metrics.totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.completedTransactions} completed transactions
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Peak Activity
            </p>
            <p className="text-lg font-bold text-foreground">
              {metrics.peakHour !== null ? `${metrics.peakHour}:00` : "N/A"}
              {metrics.peakDay && (
                <>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    on {metrics.peakDay}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              User Retention
            </p>
            <p className="text-3xl font-bold text-primary">
              {metrics.retentionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              30-day users active in 7 days
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
