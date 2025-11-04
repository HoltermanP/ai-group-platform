"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

interface Analytics {
  totals: {
    total: number;
    open: number;
    in_behandeling: number;
    afgerond: number;
    afgekeurd: number;
    goedgekeurd: number;
    readiness_afgekeurd: number;
    readiness_in_beoordeling: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byReadinessStatus: Array<{ status: string; count: number }>;
  byConnectionType: Array<{ type: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  byProject: Array<{ projectId: number; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  rejectedInspections: Array<{
    id: number;
    inspectionId: string;
    title: string;
    projectId: number;
    status: string;
    createdAt: string;
    location: string | null;
  }>;
  withoutInspectionDate: number;
  withoutLocation: number;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  chart4: "hsl(var(--chart-4))",
  destructive: "hsl(var(--destructive))",
};

const STATUS_COLORS = {
  open: COLORS.chart4,
  in_behandeling: COLORS.chart2,
  afgerond: COLORS.chart1,
  afgekeurd: COLORS.destructive,
};

const READINESS_COLORS = {
  goedgekeurd: COLORS.chart1,
  afgekeurd: COLORS.destructive,
  in_beoordeling: COLORS.chart2,
  geen_status: COLORS.chart4,
};

export default function SchouwAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/inspections/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open",
      in_behandeling: "In Behandeling",
      afgerond: "Afgerond",
      afgekeurd: "Afgekeurd",
      onbekend: "Onbekend",
    };
    return labels[status] || status;
  };

  const getReadinessLabel = (status: string) => {
    const labels: Record<string, string> = {
      goedgekeurd: "Goedgekeurd",
      afgekeurd: "Afgekeurd",
      in_beoordeling: "In Beoordeling",
      geen_status: "Geen Status",
    };
    return labels[status] || status;
  };

  const getConnectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      elektra: "Elektra",
      gas: "Gas",
      water: "Water",
      media: "Media",
    };
    return labels[type] || type;
  };

  const handleFilterClick = (filterType: string, filterValue: string) => {
    const params = new URLSearchParams();
    params.set(filterType, filterValue);
    router.push(`/dashboard/ai-schouw?${params.toString()}`);
  };

  const handleKPIClick = (status?: string) => {
    if (status) {
      router.push(`/dashboard/ai-schouw?status=${status}`);
    } else {
      router.push(`/dashboard/ai-schouw`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12 text-muted-foreground">
              Laden...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12 text-muted-foreground">
              Geen data beschikbaar
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/ai-schouw"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar Schouwen
            </Link>
            
            <h1 className="text-4xl font-bold mb-2 text-foreground">Schouw Rapportage</h1>
            <p className="text-muted-foreground">
              Gedetailleerde analyses en trends van uitgevoerde schouwen en inspecties
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card 
              onClick={() => handleKPIClick()}
              className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Totaal Schouwen</span>
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{analytics.totals.total}</p>
              <p className="text-xs text-muted-foreground mt-2">Klik om alle schouwen te zien</p>
            </Card>

            <Card 
              onClick={() => handleKPIClick('open')}
              className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Open Schouwen</span>
                <svg className="w-5 h-5 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-chart-4">{analytics.totals.open}</p>
              <p className="text-xs text-muted-foreground mt-2">Klik om open schouwen te zien</p>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg hover:border-chart-1/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Goedgekeurd</span>
                <svg className="w-5 h-5 text-chart-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-chart-1">{analytics.totals.goedgekeurd}</p>
              <p className="text-xs text-muted-foreground mt-2">Schouwen met goedkeuring</p>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg hover:border-destructive/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Afgekeurd</span>
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-destructive">{analytics.totals.readiness_afgekeurd}</p>
              <p className="text-xs text-muted-foreground mt-2">Schouwen die afgekeurd zijn</p>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 mb-6">
            {/* Maandelijkse Trend */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                📈 Schouwen Aangemaakt per Maand
              </h2>
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      dot={{ r: 5, fill: COLORS.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                💡 Monitor de groei van schouwen over tijd.
              </p>
            </Card>

            {/* Status en Readiness Status */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  📊 Verdeling per Status
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.byStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${getStatusLabel(entry.status)}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.byStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS.chart1}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ✅ Verdeling per Gereedheid Status
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.byReadinessStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${getReadinessLabel(entry.status)}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.byReadinessStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={READINESS_COLORS[entry.status as keyof typeof READINESS_COLORS] || COLORS.chart1}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Connection Type */}
            {analytics.byConnectionType.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ⚡ Schouwen per Aansluiting Type
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.byConnectionType.map(item => ({
                    ...item,
                    type: getConnectionTypeLabel(item.type),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="type" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill={COLORS.chart3} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Top Locaties en Afgekeurde Schouwen */}
            <div className="grid gap-6 md:grid-cols-2">
              {analytics.topLocations.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                    📍 Top 10 Locaties
                  </h2>
                  <div className="space-y-2">
                    {analytics.topLocations.map((location, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center border-b border-border pb-2"
                      >
                        <span className="text-sm text-foreground">{location.location}</span>
                        <span className="text-sm font-medium text-primary">{location.count} schouwen</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                  ⚠️ Afgekeurde Schouwen
                </h2>
                {analytics.rejectedInspections.length === 0 ? (
                  <p className="text-muted-foreground">Geen afgekeurde schouwen! ✅</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {analytics.rejectedInspections.map((inspection) => (
                      <div
                        key={inspection.id}
                        onClick={() => router.push(`/dashboard/ai-schouw/${inspection.id}`)}
                        className="border border-destructive/20 rounded-lg p-3 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-foreground">{inspection.title}</span>
                          <span className="text-xs text-destructive font-medium">
                            {inspection.inspectionId}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {inspection.location || 'Locatie onbekend'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Samenvatting */}
          <Card className="bg-gradient-to-r from-primary/10 to-chart-3/10 border border-primary/20 p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              💡 Schouw Samenvatting
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-foreground mb-2">📊 Status Overzicht</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {analytics.totals.open} schouwen open en wachtend op actie</li>
                  <li>• {analytics.totals.goedgekeurd} schouwen goedgekeurd</li>
                  <li>• {analytics.totals.readiness_afgekeurd} schouwen afgekeurd</li>
                  <li>• {analytics.withoutInspectionDate} schouwen zonder inspectiedatum</li>
                  <li>• {analytics.withoutLocation} schouwen zonder locatie</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">🎯 Aanbevelingen</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analytics.totals.readiness_afgekeurd > 0 && (
                    <li>• Prioriteer follow-up op {analytics.totals.readiness_afgekeurd} afgekeurde schouwen</li>
                  )}
                  {analytics.totals.open > 0 && (
                    <li>• Verwerk {analytics.totals.open} openstaande schouwen</li>
                  )}
                  {analytics.withoutInspectionDate > 0 && (
                    <li>• Voeg inspectiedatums toe aan {analytics.withoutInspectionDate} schouwen</li>
                  )}
                  <li>• Monitor maandelijks deze metrics voor proactief management</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

