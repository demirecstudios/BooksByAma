import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, {
    Circle,
    Line,
    Path,
    Rect,
    Text as SvgText,
} from "react-native-svg";
import { supabase } from "../../../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DayRevenue = {
  date: string; // "Jun 01"
  total: number;
};

type TopBook = {
  book_title: string;
  book_color: string;
  book_category: string;
  count: number;
  revenue: number;
};

type StatSummary = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueChange: number; // % vs previous 30d
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

function last30Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function prev30Days(): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - 30);
  const start = new Date();
  start.setDate(start.getDate() - 59);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// ─── Sparkline Chart ───────────────────────────────────────────────────────────

const CHART_H = 160;
const CHART_PADDING = { top: 16, bottom: 28, left: 8, right: 8 };

function RevenueChart({ data }: { data: DayRevenue[] }) {
  const screenW = Dimensions.get("window").width;
  const chartW = screenW - 40; // 20px padding each side

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const innerW = chartW - CHART_PADDING.left - CHART_PADDING.right;
  const innerH = CHART_H - CHART_PADDING.top - CHART_PADDING.bottom;

  const pts = data.map((d, i) => ({
    x: CHART_PADDING.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: CHART_PADDING.top + (1 - d.total / maxVal) * innerH,
    ...d,
  }));

  // Build SVG path
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Area fill path (close down to bottom)
  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(1)} ${(CHART_PADDING.top + innerH).toFixed(1)}` +
    ` L ${pts[0].x.toFixed(1)} ${(CHART_PADDING.top + innerH).toFixed(1)} Z`;

  // Y-axis labels: 0, mid, max
  const yLabels = [
    { val: 0, y: CHART_PADDING.top + innerH },
    { val: maxVal / 2, y: CHART_PADDING.top + innerH / 2 },
    { val: maxVal, y: CHART_PADDING.top },
  ];

  // X-axis: show ~5 evenly spaced labels
  const xStep = Math.floor(data.length / 5);
  const xLabels = pts.filter((_, i) => i % xStep === 0 || i === pts.length - 1);

  // Find peak point
  const peakIdx = data.reduce(
    (best, d, i) => (d.total > data[best].total ? i : best),
    0,
  );
  const peakPt = pts[peakIdx];

  return (
    <Svg width={chartW} height={CHART_H}>
      {/* Grid lines */}
      {yLabels.map((yl) => (
        <Line
          key={yl.val}
          x1={CHART_PADDING.left}
          y1={yl.y}
          x2={chartW - CHART_PADDING.right}
          y2={yl.y}
          stroke="#1E1E30"
          strokeWidth={1}
        />
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill="#2E86AB" opacity={0.08} />

      {/* Line */}
      <Path
        d={linePath}
        fill="none"
        stroke="#2E86AB"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Peak dot + label */}
      {peakPt && data[peakIdx].total > 0 && (
        <>
          <Circle cx={peakPt.x} cy={peakPt.y} r={4} fill="#2E86AB" />
          <Rect
            x={Math.min(peakPt.x - 28, chartW - 72)}
            y={peakPt.y - 24}
            width={64}
            height={18}
            rx={6}
            fill="#2E86AB"
          />
          <SvgText
            x={Math.min(peakPt.x, chartW - 40)}
            y={peakPt.y - 11}
            fontSize={10}
            fill="#fff"
            textAnchor="middle"
            fontWeight="700"
          >
            {formatNaira(data[peakIdx].total)}
          </SvgText>
        </>
      )}

      {/* X-axis labels */}
      {xLabels.map((p) => (
        <SvgText
          key={p.date}
          x={p.x}
          y={CHART_H - 4}
          fontSize={9}
          fill="#445566"
          textAnchor="middle"
        >
          {p.date}
        </SvgText>
      ))}

      {/* Y-axis labels */}
      {yLabels.slice(1).map((yl) => (
        <SvgText
          key={yl.val}
          x={CHART_PADDING.left + 2}
          y={yl.y - 3}
          fontSize={9}
          fill="#334455"
          textAnchor="start"
        >
          {formatNaira(yl.val)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [chartData, setChartData] = useState<DayRevenue[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [summary, setSummary] = useState<StatSummary>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    revenueChange: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { start: s30, end: e30 } = last30Days();
    const { start: sPrev, end: ePrev } = prev30Days();

    const [currentRes, prevRes, purchasesRes] = await Promise.all([
      // Current 30 days orders
      supabase
        .from("orders")
        .select("total, created_at, status")
        .gte("created_at", s30)
        .lte("created_at", e30)
        .neq("status", "refunded"),

      // Previous 30 days orders (for % change)
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", sPrev)
        .lte("created_at", ePrev)
        .neq("status", "refunded"),

      // Purchases for top books (all time)
      supabase
        .from("purchases")
        .select("book_title, book_color, book_category, price"),
    ]);

    // ── Summary stats ──
    const currentOrders = currentRes.data ?? [];
    const prevOrders = prevRes.data ?? [];

    const totalRevenue = currentOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const revenueChange =
      prevRevenue === 0
        ? 100
        : Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);

    setSummary({
      totalRevenue,
      totalOrders: currentOrders.length,
      avgOrderValue:
        currentOrders.length > 0
          ? Math.round(totalRevenue / currentOrders.length)
          : 0,
      revenueChange,
    });

    // ── Chart: bucket by day ──
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      });
      dayMap[key] = 0;
    }
    currentOrders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      });
      if (key in dayMap) dayMap[key] += o.total ?? 0;
    });
    setChartData(
      Object.entries(dayMap).map(([date, total]) => ({ date, total })),
    );

    // ── Top books ──
    const purchases = purchasesRes.data ?? [];
    const bookMap: Record<string, TopBook> = {};
    purchases.forEach((p) => {
      if (!bookMap[p.book_title]) {
        bookMap[p.book_title] = {
          book_title: p.book_title,
          book_color: p.book_color,
          book_category: p.book_category,
          count: 0,
          revenue: 0,
        };
      }
      bookMap[p.book_title].count += 1;
      bookMap[p.book_title].revenue += p.price ?? 0;
    });
    const sorted = Object.values(bookMap).sort((a, b) => b.count - a.count);
    setTopBooks(sorted.slice(0, 8));

    setLoading(false);
    setRefreshing(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#2E86AB" size="large" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const maxBookCount = Math.max(...topBooks.map((b) => b.count), 1);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchAnalytics(true)}
          tintColor="#2E86AB"
        />
      }
    >
      {/* ── Summary Cards ── */}
      <View style={styles.statsRow}>
        <SummaryCard
          label="Revenue (30d)"
          value={formatNaira(summary.totalRevenue)}
          sub={
            summary.revenueChange >= 0
              ? `▲ ${summary.revenueChange}% vs prev 30d`
              : `▼ ${Math.abs(summary.revenueChange)}% vs prev 30d`
          }
          subColor={summary.revenueChange >= 0 ? "#22BFA0" : "#FF6B6B"}
        />
        <SummaryCard
          label="Orders (30d)"
          value={String(summary.totalOrders)}
          sub="fulfilled orders"
          subColor="#445566"
        />
      </View>
      <View style={[styles.statsRow, { marginTop: 10 }]}>
        <SummaryCard
          label="Avg Order Value"
          value={formatNaira(summary.avgOrderValue)}
          sub="per transaction"
          subColor="#445566"
        />
        <SummaryCard
          label="Top Book Sales"
          value={topBooks[0] ? String(topBooks[0].count) : "—"}
          sub={topBooks[0]?.book_title ?? "No sales yet"}
          subColor="#2E86AB"
          subLines={1}
        />
      </View>

      {/* ── Revenue Chart ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>30-DAY REVENUE</Text>
        <TouchableOpacity onPress={() => fetchAnalytics()}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        {chartData.every((d) => d.total === 0) ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyEmoji}>📈</Text>
            <Text style={styles.emptyText}>No revenue data yet</Text>
          </View>
        ) : (
          <RevenueChart data={chartData} />
        )}
      </View>

      {/* ── Top Selling Books ── */}
      <Text style={styles.sectionLabel}>TOP SELLING BOOKS (ALL TIME)</Text>

      {topBooks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyText}>No purchases recorded yet</Text>
        </View>
      ) : (
        topBooks.map((book, idx) => {
          const barWidth = (book.count / maxBookCount) * 100;
          return (
            <View key={book.book_title} style={styles.bookRow}>
              {/* Rank */}
              <Text style={styles.bookRank}>#{idx + 1}</Text>

              {/* Color dot */}
              <View
                style={[
                  styles.bookDot,
                  { backgroundColor: book.book_color || "#2E86AB" },
                ]}
              />

              {/* Info + bar */}
              <View style={styles.bookInfo}>
                <View style={styles.bookTitleRow}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {book.book_title}
                  </Text>
                  <Text style={styles.bookSales}>{book.count} sold</Text>
                </View>
                <Text style={styles.bookCategory}>{book.book_category}</Text>
                {/* Progress bar */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barWidth}%` as any,
                        backgroundColor: book.book_color || "#2E86AB",
                        opacity: 0.7,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Revenue */}
              <Text style={styles.bookRevenue}>
                {formatNaira(book.revenue)}
              </Text>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  subColor,
  subLines,
}: {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  subLines?: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text
        style={[styles.summarySub, { color: subColor }]}
        numberOfLines={subLines ?? 2}
      >
        {sub}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 20 },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#445566", fontSize: 13 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 14,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#445566",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 4,
  },
  summarySub: { fontSize: 10, fontWeight: "600" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginTop: 22,
    marginBottom: 10,
  },
  refreshText: { fontSize: 12, color: "#2E86AB", fontWeight: "700" },

  // Chart
  chartCard: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  emptyChart: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 13, color: "#445566" },

  // Top books
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  bookRank: { fontSize: 11, fontWeight: "800", color: "#334455", width: 22 },
  bookDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  bookInfo: { flex: 1, minWidth: 0 },
  bookTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0EE",
    flex: 1,
    marginRight: 6,
  },
  bookSales: { fontSize: 11, fontWeight: "700", color: "#2E86AB" },
  bookCategory: { fontSize: 10, color: "#445566", marginBottom: 6 },
  barTrack: {
    height: 4,
    backgroundColor: "#1E1E30",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },
  bookRevenue: { fontSize: 12, fontWeight: "800", color: "#E8E8FF" },
});
