"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Project {
  id: number;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  projectManager: string | null;
  projectManagerId: string | null;
  organization: string | null;
  startDate: string | null;
  endDate: string | null;
  plannedEndDate: string | null;
  budget: number | null;
  currency: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface SafetyIncident {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  reportedDate: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchProject(id);
      fetchSafetyIncidents(id);
    }
  }, [params.id]);

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        setError("Project niet gevonden");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      setError("Er is een fout opgetreden bij het ophalen van het project");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSafetyIncidents = async (id: string) => {
    try {
      const response = await fetch(`/api/safety-incidents?projectId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSafetyIncidents(data);
      }
    } catch (error) {
      console.error("Error fetching safety incidents:", error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatBudget = (cents: number | null) => {
    if (!cents) return "-";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      "on-hold": "bg-chart-4/10 text-chart-4 border-chart-4/20",
      completed: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
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

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      critical: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[severity] || "bg-muted text-muted-foreground";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "data-privacy": "Data Privacy",
      "model-bias": "Model Bias",
      "security": "Security",
      "ethical-concern": "Ethische Kwestie",
      "performance": "Performance",
      "safety": "Veiligheid",
      "other": "Overig",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12 text-muted-foreground">
              Laden...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error || "Project niet gevonden"}</p>
              <Link
                href="/dashboard/projects"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Terug naar projecten
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar projecten
            </Link>
            
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-foreground">{project.name}</h1>
                  <span
                    className={`inline-flex px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(project.status)}`}
                  >
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <p className="text-muted-foreground">Project ID: {project.projectId}</p>
              </div>
              
              <button
                onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Bewerken
              </button>
            </div>
          </div>

          {/* Project Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Algemene Informatie */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Algemene Informatie
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Organisatie</p>
                  <p className="text-foreground font-medium">{project.organization || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projectmanager</p>
                  <p className="text-foreground font-medium">{project.projectManager || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground font-medium">{getStatusLabel(project.status)}</p>
                </div>
              </div>
            </div>

            {/* Financiën */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Financiën
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-foreground font-medium text-2xl">{formatBudget(project.budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valuta</p>
                  <p className="text-foreground font-medium">{project.currency}</p>
                </div>
              </div>
            </div>

            {/* Planning */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Planning
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Startdatum</p>
                  <p className="text-foreground font-medium">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Geplande einddatum</p>
                  <p className="text-foreground font-medium">{formatDate(project.plannedEndDate)}</p>
                </div>
                {project.endDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Werkelijke einddatum</p>
                    <p className="text-foreground font-medium">{formatDate(project.endDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Metadata
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Aangemaakt op</p>
                  <p className="text-foreground font-medium">{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Laatst bijgewerkt</p>
                  <p className="text-foreground font-medium">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Beschrijving */}
          {project.description && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Beschrijving</h2>
              <p className="text-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Safety Incidents */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Veiligheidsmeldingen ({safetyIncidents.length})
              </h2>
              <Link
                href="/dashboard/ai-safety"
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Alle meldingen →
              </Link>
            </div>

            {safetyIncidents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Geen veiligheidsmeldingen gekoppeld aan dit project
              </p>
            ) : (
              <div className="space-y-3">
                {safetyIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    onClick={() => router.push(`/dashboard/ai-safety/${incident.id}`)}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{incident.title}</h3>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}
                          >
                            {getSeverityLabel(incident.severity)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {incident.incidentId} • {getCategoryLabel(incident.category)}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {incident.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <span>Gemeld op {formatDate(incident.reportedDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

