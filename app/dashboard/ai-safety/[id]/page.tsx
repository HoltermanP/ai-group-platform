"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  photos: string | null;
  toolboxPresentations: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  suggestedToolboxTopics: Array<{
    topic: string;
    description: string;
    priority: string;
    suggestedItems?: string[];
  }>;
  riskAssessment: string;
  preventiveMeasures: string[];
  analysisId?: string | null;
  incidentIds?: number[];
  tokensUsed?: number | null;
}

interface SavedAnalysis {
  id: number;
  analysisId: string;
  summary: string;
  recommendations: string[];
  suggestedToolboxTopics: Array<{
    topic: string;
    description: string;
    priority: string;
    suggestedItems?: string[];
  }>;
  riskAssessment: string | null;
  preventiveMeasures: string[];
  model: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export default function SafetyIncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoInput, setPhotoInput] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [isViewingSavedAnalysis, setIsViewingSavedAnalysis] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState<string | null>(null);
  const [toolboxPresentations, setToolboxPresentations] = useState<Array<{
    id: string;
    topic: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchIncident(id);
      fetchAnalyses(id);
    }
  }, [params.id]);

  const fetchIncident = async (id: string) => {
    try {
      const response = await fetch(`/api/safety-incidents/${id}`);
      if (response.ok) {
        const data = await response.json();
        setIncident(data);
        // Parse toolbox presentations
        setToolboxPresentations(parseToolboxPresentations(data.toolboxPresentations));
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

  const fetchAnalyses = async (id: string) => {
    setIsLoadingAnalyses(true);
    try {
      const response = await fetch(`/api/safety-incidents/${id}/analyses`);
      if (response.ok) {
        const data = await response.json();
        setSavedAnalyses(data);
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  const parseToolboxPresentations = (presentationsString: string | null): Array<{
    id: string;
    topic: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
  }> => {
    if (!presentationsString) return [];
    try {
      return JSON.parse(presentationsString);
    } catch {
      return [];
    }
  };

  const handleGenerateToolboxPPT = async (topic: {
    topic: string;
    description: string;
    priority: string;
    suggestedItems?: string[];
  }) => {
    if (!incident) return;

    setIsGeneratingPPT(topic.topic);
    try {
      const response = await fetch(`/api/safety-incidents/${incident.id}/toolbox-ppt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.topic,
          description: topic.description,
          recommendations: aiAnalysis?.recommendations || [],
          suggestedItems: topic.suggestedItems || [],
          aiAnalysis: aiAnalysis ? {
            summary: aiAnalysis.summary,
            recommendations: aiAnalysis.recommendations,
            riskAssessment: aiAnalysis.riskAssessment,
            preventiveMeasures: aiAnalysis.preventiveMeasures,
          } : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fout bij het genereren van de presentatie");
      }

      const result = await response.json();
      alert("Toolbox PowerPoint succesvol gegenereerd en opgeslagen!");
      
      // Refresh incident data om nieuwe PPTs te tonen
      fetchIncident(incident.id.toString());
    } catch (error) {
      console.error("Error generating PPT:", error);
      alert(error instanceof Error ? error.message : "Er is een fout opgetreden bij het genereren van de presentatie");
    } finally {
      setIsGeneratingPPT(null);
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

  const parsePhotos = (photosString: string | null): string[] => {
    if (!photosString) return [];
    try {
      return JSON.parse(photosString);
    } catch {
      return [];
    }
  };

  const handlePhotoUpload = async () => {
    if (photoInput.length === 0 || !params.id) return;
    
    setUploadingPhotos(true);
    const formData = new FormData();
    photoInput.forEach((file) => {
      formData.append("photos", file);
    });

    try {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const response = await fetch(`/api/safety-incidents/${id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setIncident({ ...incident!, photos: JSON.stringify(data.photos) });
        setPhotoInput([]);
        // Refresh de incident data
        fetchIncident(id);
      } else {
        const error = await response.json();
        alert(error.error || "Fout bij het uploaden van foto's");
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Er is een fout opgetreden");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!incident) return;

    setIsAnalyzing(true);
    setIsViewingSavedAnalysis(false);
    try {
      const response = await fetch("/api/ai/analyze-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          incidentIds: [incident.id],
          save: false // Niet direct opslaan, eerst akkoord vragen
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fout bij AI analyse");
      }

      const result = await response.json();
      setAiAnalysis(result);
      setShowAnalysisDialog(true);
    } catch (error) {
      console.error("Error analyzing incident:", error);
      alert(error instanceof Error ? error.message : "Er is een fout opgetreden bij de AI analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!aiAnalysis || !incident) return;

    setIsSavingAnalysis(true);
    try {
      const response = await fetch("/api/ai/analyze-safety/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentIds: [incident.id],
          summary: aiAnalysis.summary,
          recommendations: aiAnalysis.recommendations,
          suggestedToolboxTopics: aiAnalysis.suggestedToolboxTopics,
          riskAssessment: aiAnalysis.riskAssessment,
          preventiveMeasures: aiAnalysis.preventiveMeasures,
          tokensUsed: aiAnalysis.tokensUsed,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fout bij het opslaan van de analyse");
      }

      alert("Analyse succesvol toegevoegd aan het incident!");
      setShowAnalysisDialog(false);
      setAiAnalysis(null);
      setIsViewingSavedAnalysis(false);
      // Refresh incident data en analyses
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      if (id) {
        fetchIncident(id);
        fetchAnalyses(id);
      }
    } catch (error) {
      console.error("Error saving analysis:", error);
      alert(error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan");
    } finally {
      setIsSavingAnalysis(false);
    }
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
              <Button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyseren...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Analyse Uitvoeren
                  </>
                )}
              </Button>
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
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Getroffen Infrastructuur</h2>
              <p className="text-foreground whitespace-pre-wrap">{incident.affectedSystems}</p>
            </div>
          )}

          {/* Opgeslagen Toolbox Presentaties */}
          {toolboxPresentations.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Toolbox Presentaties ({toolboxPresentations.length})
                </h2>
              </div>
              <div className="space-y-3">
                {toolboxPresentations.map((presentation) => (
                  <div key={presentation.id} className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h3 className="font-semibold text-foreground">{presentation.topic}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Gegenereerd op {formatDate(presentation.createdAt)}
                        </p>
                      </div>
                      <a
                        href={presentation.fileUrl}
                        download
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PPT
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opgeslagen AI Analyses */}
          {savedAnalyses.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Analyses ({savedAnalyses.length})
                </h2>
              </div>
              <div className="space-y-4">
                {savedAnalyses.map((analysis) => (
                  <div key={analysis.id} className="bg-muted/30 border border-border rounded-lg p-5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {analysis.analysisId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {formatDate(analysis.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">Samenvatting</h3>
                        <p className="text-sm text-foreground line-clamp-3 mb-3">{analysis.summary}</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2 mt-4">
                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="text-xs">
                          <span className="font-semibold text-muted-foreground">Aanbevelingen: </span>
                          <span className="text-foreground">{analysis.recommendations.length}</span>
                        </div>
                      )}
                      {analysis.preventiveMeasures && analysis.preventiveMeasures.length > 0 && (
                        <div className="text-xs">
                          <span className="font-semibold text-muted-foreground">Voorkomende maatregelen: </span>
                          <span className="text-foreground">{analysis.preventiveMeasures.length}</span>
                        </div>
                      )}
                      {analysis.model && (
                        <div className="text-xs">
                          <span className="font-semibold text-muted-foreground">Model: </span>
                          <span className="text-foreground">{analysis.model}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAiAnalysis({
                          summary: analysis.summary,
                          recommendations: analysis.recommendations,
                          suggestedToolboxTopics: analysis.suggestedToolboxTopics,
                          riskAssessment: analysis.riskAssessment || "",
                          preventiveMeasures: analysis.preventiveMeasures,
                        });
                        setIsViewingSavedAnalysis(true);
                        setShowAnalysisDialog(true);
                      }}
                      className="mt-4"
                    >
                      Volledige Analyse Bekijken
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Foto's Toevoegen */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Foto's
            </h2>
            <div className="space-y-4">
              {/* Upload Input */}
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setPhotoInput(Array.from(e.target.files));
                    }
                  }}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
                />
                {photoInput.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photoInput.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm">
                        <span className="text-foreground">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setPhotoInput(photoInput.filter((_, i) => i !== index))}
                          className="text-destructive hover:text-destructive/80 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photoInput.length > 0 && (
                  <button
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {uploadingPhotos ? "Uploaden..." : "Foto's Uploaden"}
                  </button>
                )}
              </div>

              {/* Foto Gallery */}
              {(() => {
                const photos = parsePhotos(incident.photos);
                if (photos.length > 0) {
                  return (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4 text-foreground">Geüploade Foto's</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {photos.map((photoUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`Foto ${index + 1} van incident ${incident.incidentId}`}
                              className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(photoUrl, "_blank")}
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                                Klik om te vergroten
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-muted-foreground text-sm">
                    Nog geen foto's toegevoegd. Upload foto's hierboven.
                  </p>
                );
              })()}
            </div>
          </div>

          {/* AI Analyse Dialog */}
          <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto border-2 border-border shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] bg-card ring-4 ring-black/20">
              <DialogHeader>
                <DialogTitle>AI Analyse Resultaten</DialogTitle>
                <DialogDescription>
                  {isViewingSavedAnalysis 
                    ? "Bekijk de opgeslagen AI analyse van dit incident."
                    : "Bekijk de AI analyse van dit incident. Geef akkoord om de analyse toe te voegen aan het incident."}
                </DialogDescription>
              </DialogHeader>
              
              {aiAnalysis && (
                <div className="space-y-6 py-4">
                  {/* Samenvatting */}
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-foreground">Samenvatting</h3>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{aiAnalysis.summary}</p>
                  </div>

                  {/* Aanbevelingen */}
                  {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground">Aanbevelingen</h3>
                      </div>
                      <ul className="space-y-3">
                        {aiAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-foreground leading-relaxed pt-0.5">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risico Inschatting */}
                  {aiAnalysis.riskAssessment && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-6 border-2 border-orange-200 dark:border-orange-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Risico Inschatting</h3>
                      </div>
                      <p className="text-orange-900 dark:text-orange-100 whitespace-pre-wrap leading-relaxed">{aiAnalysis.riskAssessment}</p>
                    </div>
                  )}

                  {/* Voorkomende Maatregelen */}
                  {aiAnalysis.preventiveMeasures && aiAnalysis.preventiveMeasures.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground">Voorkomende Maatregelen</h3>
                      </div>
                      <ul className="space-y-3">
                        {aiAnalysis.preventiveMeasures.map((measure, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-foreground leading-relaxed pt-0.5">{measure}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Voorgestelde Toolbox Onderwerpen */}
                  {aiAnalysis.suggestedToolboxTopics && aiAnalysis.suggestedToolboxTopics.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground">Voorgestelde Toolbox Onderwerpen</h3>
                      </div>
                      <div className="space-y-4">
                        {aiAnalysis.suggestedToolboxTopics.map((topic, index) => (
                          <div key={index} className="bg-muted/30 border border-border rounded-lg p-5 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold text-foreground text-base">{topic.topic}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                topic.priority === 'high' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                topic.priority === 'medium' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                'bg-chart-1/10 text-chart-1 border border-chart-1/20'
                              }`}>
                                {topic.priority === 'high' ? 'Hoog' : topic.priority === 'medium' ? 'Middel' : 'Laag'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{topic.description}</p>
                            {topic.suggestedItems && topic.suggestedItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Voorgestelde items</p>
                                <div className="flex flex-wrap gap-2">
                                  {topic.suggestedItems.map((item, itemIndex) => (
                                    <span key={itemIndex} className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-4 pt-3 border-t border-border">
                              <Button
                                onClick={() => handleGenerateToolboxPPT(topic)}
                                disabled={isGeneratingPPT === topic.topic || !incident}
                                size="sm"
                                className="w-full"
                              >
                                {isGeneratingPPT === topic.topic ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    PowerPoint genereren...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Maak Toolbox PowerPoint
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAnalysisDialog(false);
                    setAiAnalysis(null);
                    setIsViewingSavedAnalysis(false);
                  }}
                  disabled={isSavingAnalysis}
                >
                  {isViewingSavedAnalysis ? "Sluiten" : "Annuleren"}
                </Button>
                {!isViewingSavedAnalysis && (
                  <Button
                    onClick={handleSaveAnalysis}
                    disabled={isSavingAnalysis}
                  >
                    {isSavingAnalysis ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Opslaan...
                      </>
                    ) : (
                      "Akkoord & Toevoegen aan Incident"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

