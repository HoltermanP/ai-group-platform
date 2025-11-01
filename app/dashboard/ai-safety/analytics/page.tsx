"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

interface Analytics {
  totals: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    closed: number;
    critical: number;
    high: number;
  };
  byCategory: Array<{ category: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byInfrastructure: Array<{ type: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  avgResolutionTime: number | null;
  resolutionTimeByCategory: Array<{ category: string; avgDays: number }>;
  topLocations: Array<{ location: string; count: number }>;
  criticalIncidents: Array<{
    id: number;
    incidentId: string;
    title: string;
    category: string;
    status: string;
    reportedDate: string;
    location: string | null;
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

const SEVERITY_COLORS = {
  low: COLORS.chart1,
  medium: COLORS.chart4,
  high: "#f97316",
  critical: COLORS.destructive,
};

export default function SafetyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/safety-incidents/analytics");
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      graafschade: "Graafschade",
      lekkage: "Lekkage",
      verzakking: "Verzakking",
      corrosie: "Corrosie",
      obstructie: "Obstructie",
      elektrisch: "Elektrisch",
      structureel: "Structureel",
      verontreiniging: "Verontreiniging",
      onderhoud: "Onderhoud",
      overig: "Overig",
    };
    return labels[category] || category;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      low: "Laag",
      medium: "Middel",
      high: "Hoog",
      critical: "Kritiek",
    };
    return labels[severity] || severity;
  };

  const getInfraLabel = (type: string) => {
    const labels: Record<string, string> = {
      riool: "Riool",
      water: "Water",
      gas: "Gas",
      elektra: "Elektra",
      telecom: "Telecom",
      warmte: "Warmte",
      metro: "Metro",
      tunnel: "Tunnel",
      onbekend: "Onbekend",
    };
    return labels[type] || type;
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
              href="/dashboard/ai-safety"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar Veiligheidsmeldingen
            </Link>
            
            <h1 className="text-4xl font-bold mb-2 text-foreground">Veiligheids Analyse</h1>
            <p className="text-muted-foreground">
              Trends, statistieken en inzichten voor verbeterde veiligheidscultuur
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Totaal Meldingen</span>
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{analytics.totals.total}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Kritieke Meldingen</span>
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-destructive">{analytics.totals.critical}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Open Meldingen</span>
                <svg className="w-5 h-5 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">{analytics.totals.open}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Gem. Oplostijd</span>
                <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {analytics.avgResolutionTime ? `${analytics.avgResolutionTime}d` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 mb-6">
            {/* Maandelijkse Trend */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                📈 Trend Veiligheidsmeldingen over Tijd
              </h2>
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
                    strokeWidth={2}
                    name="Aantal meldingen"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-4">
                💡 <strong>Inzicht:</strong> Monitor stijgingen in meldingen om proactief beleid aan te passen. 
                Seizoenspatronen kunnen duiden op specifieke risicofactoren.
              </p>
            </div>

            {/* Categorie en Ernst */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Distributie per Categorie */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  📊 Meldingen per Categorie
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.byCategory.map(item => ({
                    ...item,
                    category: getCategoryLabel(item.category)
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
                    <Bar dataKey="count" fill={COLORS.chart3} name="Aantal" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground mt-4">
                  💡 Focus preventie op meest voorkomende categorieën
                </p>
              </div>

              {/* Distributie per Ernst */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ⚠️ Verdeling Ernst Niveau
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.bySeverity.map(item => ({
                        ...item,
                        severity: getSeverityLabel(item.severity)
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.severity}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.bySeverity.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS] || COLORS.chart1} 
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
                <p className="text-sm text-muted-foreground mt-4">
                  💡 Hoog percentage kritiek? Verhoog veiligheidsprotocollen
                </p>
              </div>
            </div>

            {/* Infrastructuurtype */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                🏗️ Risico per Infrastructuurtype
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.byInfrastructure.map(item => ({
                  ...item,
                  type: getInfraLabel(item.type)
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
                  <Bar dataKey="count" fill={COLORS.chart2} name="Aantal incidents" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-4">
                💡 <strong>Actie:</strong> Verhoog inspectiefrequentie bij hoogrisico infrastructuur
              </p>
            </div>

            {/* Oplostijd per Categorie */}
            {analytics.resolutionTimeByCategory.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                  ⏱️ Gemiddelde Oplostijd per Categorie
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.resolutionTimeByCategory.map(item => ({
                    ...item,
                    category: getCategoryLabel(item.category)
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
                    />
                    <Bar dataKey="avgDays" fill={COLORS.chart4} name="Gemiddeld aantal dagen" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground mt-4">
                  💡 Langere oplostijden vereisen mogelijk extra resources of training
                </p>
              </div>
            )}

            {/* Top Risico Locaties en Kritieke Incidents */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Locaties */}
              {analytics.topLocations.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                    📍 Top 10 Risico Locaties
                  </h2>
                  <div className="space-y-2">
                    {analytics.topLocations.map((location, index) => (
                      <div key={index} className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-sm text-foreground">{location.location}</span>
                        <span className="text-sm font-medium text-primary">{location.count} meldingen</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    💡 Hotspots vereisen preventieve maatregelen en extra toezicht
                  </p>
                </div>
              )}

              {/* Kritieke Incidents */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                  <span className="inline-flex px-2 py-1 rounded text-xs font-medium border bg-destructive/10 text-destructive border-destructive/20">
                    {analytics.criticalIncidents.length}
                  </span>
                  Actieve Kritieke Meldingen
                </h2>
                {analytics.criticalIncidents.length === 0 ? (
                  <p className="text-muted-foreground">Geen actieve kritieke meldingen! ✅</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {analytics.criticalIncidents.map((incident) => (
                      <div key={incident.id} className="border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-foreground">{incident.title}</span>
                          <span className="text-xs text-destructive font-medium">{incident.incidentId}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {incident.location || 'Locatie onbekend'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  💡 <strong>Prioriteit:</strong> Kritieke meldingen vereisen directe actie
                </p>
              </div>
            </div>
          </div>

          {/* Aanbevelingen */}
          <div className="bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/20 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              💡 Aanbevelingen voor Veiligheidscultuur
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-foreground mb-2">📚 Preventie & Training</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Organiseer regelmatige veiligheidstrainingen voor meest voorkomende categorieën</li>
                  <li>• Deel best practices van snel opgeloste incidents</li>
                  <li>• Creëer bewustzijn bij aannemers over hotspot locaties</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">🎯 Procesverbetering</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Verkort oplostijd door snellere escalatie bij kritieke meldingen</li>
                  <li>• Implementeer preventief onderhoud op hoogrisico infrastructuur</li>
                  <li>• Evalueer maandelijks trends voor vroegtijdige signalering</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">👥 Communicatie</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Deel deze analytics met alle stakeholders</li>
                  <li>• Bespreek trends in veiligheidsoverleg</li>
                  <li>• Beloon teams met minste incidenten</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">📊 Monitoring</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Stel KPI targets voor reductie kritieke incidents</li>
                  <li>• Monitor maandelijks de voortgang</li>
                  <li>• Pas strategie aan op basis van data-inzichten</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

