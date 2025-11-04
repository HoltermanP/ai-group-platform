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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Analytics {
  totals: {
    total: number;
    active: number;
    onHold: number;
    completed: number;
    cancelled: number;
    withBudget: number;
    delayed: number;
    totalBudget: number;
    totalIncidents: number;
    totalInspections: number;
    totalSupervisions: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byDiscipline: Array<{ discipline: string; count: number }>;
  byOrganization: Array<{ organization: string; count: number; totalBudget: number }>;
  byGemeente: Array<{ gemeente: string; count: number }>;
  byManager: Array<{ manager: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  budgetByCategory: Array<{ category: string; budget: number }>;
  budgetByDiscipline: Array<{ discipline: string; budget: number }>;
  topIncidentProjects: Array<{
    id: number;
    projectId: string;
    name: string;
    incidentsCount: number;
    criticalIncidents: number;
    location: string;
  }>;
  delayedProjects: Array<{
    id: number;
    projectId: string;
    name: string;
    daysDelayed: number;
    plannedEndDate: string | null;
    location: string;
  }>;
  avgDurationByCategory: Array<{ category: string; avgDays: number }>;
  projectsWithoutBudget: number;
  projectsWithoutStartDate: number;
  projectsWithoutEndDate: number;
  projectsWithCriticalIncidents: Array<{
    id: number;
    projectId: string;
    name: string;
    criticalIncidents: number;
    highIncidents: number;
    location: string;
  }>;
  qualityScores: Array<{
    id: number;
    projectId: string;
    name: string;
    excellent: number;
    good: number;
    total: number;
    score: number;
  }>;
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
  active: COLORS.chart2,
  "on-hold": COLORS.chart4,
  completed: COLORS.chart1,
  cancelled: COLORS.destructive,
};

export default function ProjectAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      console.log("[Frontend] Fetching analytics from /api/projects/analytics");
      const response = await fetch("/api/projects/analytics");
      console.log("[Frontend] Response status:", response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Frontend] Full analytics response keys:", Object.keys(data));
        console.log("[Frontend] Full analytics response:", JSON.stringify(data, null, 2));
        console.log("[Frontend] Analytics data received:", {
          totalProjects: data.totals?.total,
          hasByStatus: data.byStatus?.length > 0,
          hasByCategory: data.byCategory?.length > 0,
          hasDebug: !!data._debug,
        });
        
        // Log debug info if available
        if (data._debug) {
          console.log("[Frontend] DEBUG INFO:", data._debug);
          console.log("[Frontend] Problem analysis:", {
            isAdmin: data._debug.userIsAdmin,
            userOrgIds: data._debug.userOrgIds,
            totalInDb: data._debug.totalProjectsInDb,
            projectsFound: data._debug.projectsFound,
            orgIdsInDb: data._debug.allOrgIdsInDb,
            hasMatchingOrgs: data._debug.userOrgIds?.length > 0 
              ? data._debug.userOrgIds.some((id: number) => data._debug.allOrgIdsInDb.includes(id))
              : false,
          });
        } else {
          console.warn("[Frontend] No debug info available!");
          console.warn("[Frontend] Response structure:", {
            hasTotals: !!data.totals,
            hasByStatus: !!data.byStatus,
            allKeys: Object.keys(data),
          });
        }
        
        setAnalytics(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch analytics:", response.status, response.statusText, errorText);
        // Set empty analytics to show empty state
        setAnalytics({
          totals: {
            total: 0,
            active: 0,
            onHold: 0,
            completed: 0,
            cancelled: 0,
            withBudget: 0,
            delayed: 0,
            totalBudget: 0,
            totalIncidents: 0,
            totalInspections: 0,
            totalSupervisions: 0,
          },
          byStatus: [],
          byCategory: [],
          byDiscipline: [],
          byOrganization: [],
          byGemeente: [],
          byManager: [],
          monthlyTrend: [],
          budgetByCategory: [],
          budgetByDiscipline: [],
          topIncidentProjects: [],
          delayedProjects: [],
          avgDurationByCategory: [],
          projectsWithoutBudget: 0,
          projectsWithoutStartDate: 0,
          projectsWithoutEndDate: 0,
          projectsWithCriticalIncidents: [],
          qualityScores: [],
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Set empty analytics to show empty state
      setAnalytics({
        totals: {
          total: 0,
          active: 0,
          onHold: 0,
          completed: 0,
          cancelled: 0,
          withBudget: 0,
          delayed: 0,
          totalBudget: 0,
          totalIncidents: 0,
          totalInspections: 0,
          totalSupervisions: 0,
        },
        byStatus: [],
        byCategory: [],
        byDiscipline: [],
        byOrganization: [],
        byGemeente: [],
        byManager: [],
        monthlyTrend: [],
        budgetByCategory: [],
        budgetByDiscipline: [],
        topIncidentProjects: [],
        delayedProjects: [],
        avgDurationByCategory: [],
        projectsWithoutBudget: 0,
        projectsWithoutStartDate: 0,
        projectsWithoutEndDate: 0,
        projectsWithCriticalIncidents: [],
        qualityScores: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Actief",
      "on-hold": "On Hold",
      completed: "Afgerond",
      cancelled: "Geannuleerd",
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      sanering: "Sanering",
      reconstructie: "Reconstructie",
      "nieuwe-aanleg": "Nieuwe Aanleg",
      onbekend: "Onbekend",
    };
    return labels[category] || category;
  };

  const getDisciplineLabel = (discipline: string) => {
    const labels: Record<string, string> = {
      Elektra: "Elektra",
      Gas: "Gas",
      Water: "Water",
      Media: "Media",
      onbekend: "Onbekend",
    };
    return labels[discipline] || discipline;
  };

  const formatBudget = (cents: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL");
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

  if (!analytics || analytics.totals.total === 0) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Terug naar Projecten
              </Link>
              
              <h1 className="text-4xl font-bold mb-2 text-foreground">Project Rapportage</h1>
              <p className="text-muted-foreground">
                Uitgebreide analyses en inzichten voor projectbeheer en portfolio management
              </p>
            </div>

            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="text-2xl font-semibold mb-2 text-foreground">Geen projecten gevonden</h2>
                <p className="text-muted-foreground mb-6">
                  Er zijn nog geen projecten aangemaakt om te analyseren. Maak je eerste project aan om rapportages te zien.
                </p>
                <Button onClick={() => router.push("/dashboard/projects")}>
                  Naar Projecten
                </Button>
              </div>
            </Card>
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
              href="/dashboard/projects"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar Projecten
            </Link>
            
            <h1 className="text-4xl font-bold mb-2 text-foreground">Project Rapportage</h1>
            <p className="text-muted-foreground">
              Uitgebreide analyses en inzichten voor projectbeheer en portfolio management
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card 
              onClick={() => router.push("/dashboard/projects")}
              className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Totaal Projecten</span>
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{analytics.totals.total}</p>
              <p className="text-xs text-muted-foreground mt-2">Klik om alle projecten te zien</p>
            </Card>

            <Card 
              onClick={() => router.push("/dashboard/projects?status=active")}
              className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Actieve Projecten</span>
                <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-chart-2">{analytics.totals.active}</p>
              <p className="text-xs text-muted-foreground mt-2">Klik om actieve projecten te zien</p>
            </Card>

            <Card 
              onClick={() => router.push("/dashboard/projects?status=completed")}
              className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Afgerond</span>
                <svg className="w-5 h-5 text-chart-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-chart-1">{analytics.totals.completed}</p>
              <p className="text-xs text-muted-foreground mt-2">Klik om afgeronde projecten te zien</p>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg hover:border-destructive/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Vertraagd</span>
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-destructive">{analytics.totals.delayed}</p>
              <p className="text-xs text-muted-foreground mt-2">Projecten die achterlopen</p>
            </Card>
          </div>

          {/* Budget KPI */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Totaal Budget</span>
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{formatBudget(analytics.totals.totalBudget)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.totals.withBudget} van {analytics.totals.total} projecten hebben budget
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Veiligheidsincidenten</span>
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{analytics.totals.totalIncidents}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Totaal aantal incidenten over alle projecten
              </p>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 mb-6">
            {/* Maandelijkse Trend */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                📈 Projecten Aangemaakt per Maand
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
                💡 Monitor de groei van je projectportfolio over tijd.
              </p>
            </Card>

            {/* Status en Categorie */}
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
                  🏗️ Projecten per Categorie
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.byCategory.map(item => ({
                    ...item,
                    category: getCategoryLabel(item.category),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="category" 
                      stroke="hsl(var(--muted-foreground))"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '11px' }}
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
            </div>

            {/* Discipline en Budget */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ⚡ Projecten per Discipline
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.byDiscipline.map(item => ({
                    ...item,
                    discipline: getDisciplineLabel(item.discipline),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="discipline" 
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
                    <Bar dataKey="count" fill={COLORS.chart2} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  💰 Budget per Categorie
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.budgetByCategory.map(item => ({
                    ...item,
                    category: getCategoryLabel(item.category),
                    budget: item.budget / 100, // Convert to euros
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="category" 
                      stroke="hsl(var(--muted-foreground))"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatBudget(value * 100)}
                    />
                    <Bar dataKey="budget" fill={COLORS.chart4} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Geografische en Organisatie */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  📍 Top 10 Gemeenten
                </h2>
                <div className="space-y-2">
                  {analytics.byGemeente.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center border-b border-border pb-2"
                    >
                      <span className="text-sm text-foreground">{item.gemeente}</span>
                      <span className="text-sm font-medium text-primary">{item.count} projecten</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  🏢 Projecten per Organisatie
                </h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {analytics.byOrganization.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center border-b border-border pb-2"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-foreground font-medium">{item.organization}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatBudget(item.totalBudget)}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Vertraagde Projecten en Kritieke Incidenten */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                  ⏰ Projecten die Dreigen te Vertragen
                </h2>
                {analytics.delayedProjects.length === 0 ? (
                  <p className="text-muted-foreground">Geen vertraagde projecten! ✅</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {analytics.delayedProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        className="border border-destructive/20 rounded-lg p-3 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-foreground">{project.name}</span>
                          <span className="text-xs text-destructive font-medium">
                            {project.daysDelayed} dagen
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.projectId} • {project.location}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Gepland: {formatDate(project.plannedEndDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                  ⚠️ Projecten met Kritieke Incidenten
                </h2>
                {analytics.projectsWithCriticalIncidents.length === 0 ? (
                  <p className="text-muted-foreground">Geen projecten met kritieke incidenten! ✅</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {analytics.projectsWithCriticalIncidents.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        className="border border-destructive/20 rounded-lg p-3 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-foreground">{project.name}</span>
                          <span className="text-xs text-destructive font-medium">
                            {project.criticalIncidents} kritiek
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.projectId} • {project.location}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.highIncidents} hoog risico incidenten
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Gemiddelde Duur en Top Incident Projecten */}
            {analytics.avgDurationByCategory.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ⏱️ Gemiddelde Projectduur per Categorie
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.avgDurationByCategory.map(item => ({
                    ...item,
                    category: getCategoryLabel(item.category),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="category" 
                      stroke="hsl(var(--muted-foreground))"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: 'Dagen', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value} dagen`}
                    />
                    <Bar dataKey="avgDays" fill={COLORS.chart4} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Top Incident Projecten */}
            {analytics.topIncidentProjects.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  🔴 Top 10 Projecten met Meeste Incidenten
                </h2>
                <div className="space-y-2">
                  {analytics.topIncidentProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      className="flex justify-between items-center border-b border-border pb-2 cursor-pointer hover:bg-primary/5 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex-1">
                        <span className="text-sm text-foreground font-medium">{project.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {project.projectId} • {project.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-destructive">
                          {project.incidentsCount} incidenten
                        </span>
                        {project.criticalIncidents > 0 && (
                          <div className="text-xs text-destructive">
                            {project.criticalIncidents} kritiek
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Samenvatting en Aanbevelingen */}
          <Card className="bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/20 p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              💡 Project Portfolio Samenvatting
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-foreground mb-2">📊 Portfolio Status</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {analytics.totals.active} actieve projecten in uitvoering</li>
                  <li>• {analytics.totals.completed} projecten succesvol afgerond</li>
                  <li>• {analytics.totals.delayed} projecten lopen achter op planning</li>
                  <li>• {analytics.projectsWithoutBudget} projecten zonder budget toegewezen</li>
                  <li>• {analytics.projectsWithoutStartDate} projecten zonder startdatum</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">🎯 Aanbevelingen</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analytics.totals.delayed > 0 && (
                    <li>• Prioriteer {analytics.totals.delayed} vertraagde projecten voor follow-up</li>
                  )}
                  {analytics.projectsWithCriticalIncidents.length > 0 && (
                    <li>• Verhoog toezicht op projecten met kritieke incidenten</li>
                  )}
                  {analytics.projectsWithoutBudget > 0 && (
                    <li>• Wijs budget toe aan {analytics.projectsWithoutBudget} projecten</li>
                  )}
                  {analytics.totals.totalIncidents > 0 && (
                    <li>• Analyseer oorzaken van incidenten voor preventie</li>
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

