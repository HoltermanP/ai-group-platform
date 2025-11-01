"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface SafetyIncident {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority: string;
  infrastructureType: string | null;
  location: string | null;
  coordinates: string | null;
  depth: string | null;
  projectId: number | null;
  impact: string | null;
  mitigation: string | null;
  affectedSystems: string | null;
  safetyMeasures: string | null;
  riskAssessment: string | null;
  reportedBy: string;
  assignedTo: string | null;
  contractor: string | null;
  detectedDate: string | null;
  reportedDate: string;
  resolvedDate: string | null;
  tags: string | null;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SafetyIncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchIncident(id);
    }
  }, [params.id]);

  const fetchIncident = async (id: string) => {
    try {
      const response = await fetch(`/api/safety-incidents/${id}`);
      if (response.ok) {
        const data = await response.json();
        setIncident(data);
      } else {
        setError("Veiligheidsmelding niet gevonden");
      }
    } catch (error) {
      console.error("Error fetching incident:", error);
      setError("Er is een fout opgetreden bij het ophalen van de veiligheidsmelding");
    } finally {
      setIsLoading(false);
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "graafschade": "Graafschade",
      "lekkage": "Lekkage",
      "verzakking": "Verzakking/Deformatie",
      "corrosie": "Corrosie",
      "obstructie": "Obstructie/Verstopping",
      "elektrisch": "Elektrische Storing",
      "structureel": "Structurele Schade",
      "verontreiniging": "Bodemverontreiniging",
      "onderhoud": "Onderhoud",
      "overig": "Overig",
    };
    return labels[category] || category;
  };

  const getInfrastructureLabel = (type: string | null) => {
    if (!type) return "-";
    const labels: Record<string, string> = {
      "riool": "Riool",
      "water": "Waterleidingen",
      "gas": "Gasleidingen",
      "elektra": "Elektriciteit",
      "telecom": "Telecom/Kabel",
      "warmte": "Warmtenet",
      "metro": "Metro/Spoor",
      "tunnel": "Tunnel",
      "parkeergarage": "Ondergrondse Parkeergarage",
      "overig": "Overig",
    };
    return labels[type] || type;
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open",
      investigating: "In Onderzoek",
      resolved: "Opgelost",
      closed: "Gesloten",
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Laag",
      medium: "Middel",
      high: "Hoog",
      urgent: "Urgent",
    };
    return labels[priority] || priority;
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      investigating: "bg-primary/10 text-primary border-primary/20",
      resolved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      closed: "bg-muted text-muted-foreground border-border",
    };
    return colors[status] || "bg-muted text-muted-foreground";
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

  if (error || !incident) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error || "Veiligheidsmelding niet gevonden"}</p>
              <Link
                href="/dashboard/ai-safety"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Terug naar AI Safety
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
              href="/dashboard/ai-safety"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar Veiligheidsmeldingen
            </Link>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-foreground">{incident.title}</h1>
                </div>
                <p className="text-muted-foreground">Incident ID: {incident.incidentId}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex px-3 py-1 rounded-md text-sm font-medium border ${getSeverityColor(incident.severity)}`}
              >
                Ernst: {getSeverityLabel(incident.severity)}
              </span>
              <span
                className={`inline-flex px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(incident.status)}`}
              >
                {getStatusLabel(incident.status)}
              </span>
              <span className="inline-flex px-3 py-1 rounded-md text-sm font-medium border bg-muted/50 text-foreground border-border">
                {getCategoryLabel(incident.category)}
              </span>
              <span className="inline-flex px-3 py-1 rounded-md text-sm font-medium border bg-muted/50 text-foreground border-border">
                Prioriteit: {getPriorityLabel(incident.priority)}
              </span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Incident Details */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Incident Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Categorie</p>
                  <p className="text-foreground font-medium">{getCategoryLabel(incident.category)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type Infrastructuur</p>
                  <p className="text-foreground font-medium">{getInfrastructureLabel(incident.infrastructureType)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ernst</p>
                  <p className="text-foreground font-medium">{getSeverityLabel(incident.severity)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioriteit</p>
                  <p className="text-foreground font-medium">{getPriorityLabel(incident.priority)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground font-medium">{getStatusLabel(incident.status)}</p>
                </div>
              </div>
            </div>

            {/* Locatie */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Locatie
              </h2>
              <div className="space-y-3">
                {incident.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Adres</p>
                    <p className="text-foreground font-medium">{incident.location}</p>
                  </div>
                )}
                {incident.coordinates && (
                  <div>
                    <p className="text-sm text-muted-foreground">GPS Coördinaten</p>
                    <p className="text-foreground font-medium font-mono text-sm">{incident.coordinates}</p>
                  </div>
                )}
                {incident.depth && (
                  <div>
                    <p className="text-sm text-muted-foreground">Diepte</p>
                    <p className="text-foreground font-medium">{incident.depth} meter</p>
                  </div>
                )}
                {incident.contractor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Aannemer</p>
                    <p className="text-foreground font-medium">{incident.contractor}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Datums */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tijdlijn
              </h2>
              <div className="space-y-3">
                {incident.detectedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Gedetecteerd</p>
                    <p className="text-foreground font-medium">{formatDate(incident.detectedDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Gemeld</p>
                  <p className="text-foreground font-medium">{formatDate(incident.reportedDate)}</p>
                </div>
                {incident.resolvedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Opgelost</p>
                    <p className="text-foreground font-medium">{formatDate(incident.resolvedDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Laatst bijgewerkt</p>
                  <p className="text-foreground font-medium">{formatDate(incident.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Project Koppeling */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Project
              </h2>
              <div>
                {incident.projectId ? (
                  <Link
                    href={`/dashboard/projects/${incident.projectId}`}
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Bekijk project →
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Algemene melding (geen project)</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tags & Links
              </h2>
              <div className="space-y-3">
                {incident.tags && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {incident.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {incident.externalReference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Externe Referentie</p>
                    <a
                      href={incident.externalReference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors text-sm"
                    >
                      {incident.externalReference} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground">Beschrijving</h2>
            <p className="text-foreground whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Impact */}
          {incident.impact && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Impact</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.impact}</p>
            </div>
          )}

          {/* Mitigation */}
          {incident.mitigation && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Genomen Maatregelen</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.mitigation}</p>
            </div>
          )}

          {/* Safety Measures */}
          {incident.safetyMeasures && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Veiligheidsmaatregelen ter Plaatse</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.safetyMeasures}</p>
            </div>
          )}

          {/* Risk Assessment */}
          {incident.riskAssessment && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Risico Inschatting</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.riskAssessment}</p>
            </div>
          )}

          {/* Affected Systems */}
          {incident.affectedSystems && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Getroffen Infrastructuur</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.affectedSystems}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

