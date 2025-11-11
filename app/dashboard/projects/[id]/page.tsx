"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PROJECT_DOCUMENT_TYPES } from "@/lib/constants/project-documents";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

interface ProjectDocument {
  id: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedAt: string;
  uploadedBy: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingForType, setUploadingForType] = useState<string | null>(null);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchProject(id);
      fetchSafetyIncidents(id);
      fetchDocuments(id);
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
        const result = await response.json();
        // Nieuwe API structuur: { data, pagination }
        setSafetyIncidents(result.data || result);
      }
    } catch (error) {
      console.error("Error fetching safety incidents:", error);
    }
  };

  const fetchDocuments = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile || !selectedDocumentType || !params.id) return;
    
    setUploadingDocument(true);
    setUploadingForType(selectedDocumentType);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documentType", selectedDocumentType);

    try {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const response = await fetch(`/api/projects/${id}/documents`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments([...documents, data.document]);
        setSelectedFile(null);
        setSelectedDocumentType("");
        setUploadDialogOpen(false);
        setUploadingForType(null);
        // Reset file input
        const fileInput = document.getElementById("document-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        const error = await response.json();
        alert(error.error || "Er is een fout opgetreden bij het uploaden");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Er is een fout opgetreden bij het uploaden");
    } finally {
      setUploadingDocument(false);
      setUploadingForType(null);
    }
  };

  const openUploadDialog = (documentType: string) => {
    setSelectedDocumentType(documentType);
    setUploadDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string) => {
    return PROJECT_DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
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
              
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/dashboard/projects/${project.id}/planning`)}
                  className="px-4 py-2 bg-chart-3 text-primary-foreground rounded-md hover:bg-chart-3/90 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Planning
                </button>
                <button
                  onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Bewerken
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg className="w-5 h-5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Planning
                </h2>
                <Link
                  href={`/dashboard/projects/${project.id}/planning`}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Beheer planning →
                </Link>
              </div>
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
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
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

          {/* Project Documenten */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Project Documenten ({documents.length}/{PROJECT_DOCUMENT_TYPES.length})
            </h2>

            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[3%] px-1 text-center">Status</TableHead>
                    <TableHead className="w-[32%] px-2">Document type</TableHead>
                    <TableHead className="w-[25%] px-2">Bestand</TableHead>
                    <TableHead className="w-[8%] px-1 text-center">Grootte</TableHead>
                    <TableHead className="w-[32%] px-2">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROJECT_DOCUMENT_TYPES.map((type) => {
                    const typeDocuments = documents.filter(doc => doc.documentType === type.value);
                    const hasDocument = typeDocuments.length > 0;
                    const document = typeDocuments[0]; // Neem het eerste document als er meerdere zijn
                    const isUploading = uploadingForType === type.value;

                    return (
                      <TableRow 
                        key={type.value}
                        className={hasDocument ? "bg-chart-1/5" : ""}
                      >
                        <TableCell className="px-1 text-center">
                          {hasDocument ? (
                            <div className="flex items-center justify-center">
                              <svg className="w-4 h-4 text-chart-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-foreground text-xs truncate">{type.label}</span>
                            <div className="flex-shrink-0">
                              {hasDocument && (
                                <Badge variant="outline" className="text-[10px] bg-chart-1/10 text-chart-1 border-chart-1/20 px-1 py-0">
                                  Geüpload
                                </Badge>
                              )}
                              {!hasDocument && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  Ontbreekt
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2">
                          {hasDocument && document ? (
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 flex items-center gap-1 font-medium text-xs"
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span className="truncate" title={document.fileName}>
                                {document.fileName}
                              </span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[10px] px-1 text-center">
                          {hasDocument && document ? formatFileSize(document.fileSize) : "-"}
                        </TableCell>
                        <TableCell className="px-2">
                          {hasDocument ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateShort(document.uploadedAt)}
                              </span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUploadDialog(type.value)}
                              disabled={isUploading || uploadingDocument}
                              className="text-[10px] h-7 px-2"
                            >
                              {isUploading ? (
                                <>
                                  <svg className="w-3 h-3 mr-1 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Uploaden...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Uploaden
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Upload Dialog */}
            <Dialog 
              open={uploadDialogOpen} 
              onOpenChange={(open) => {
                setUploadDialogOpen(open);
                if (!open) {
                  // Reset state wanneer dialog sluit
                  setSelectedFile(null);
                  setSelectedDocumentType("");
                  const fileInput = document.getElementById("document-file") as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedDocumentType 
                      ? `${getDocumentTypeLabel(selectedDocumentType)} uploaden`
                      : "Nieuw document uploaden"
                    }
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {!selectedDocumentType && (
                    <div>
                      <Label htmlFor="document-type">Document type</Label>
                      <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                        <SelectTrigger id="document-type">
                          <SelectValue placeholder="Selecteer document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedDocumentType && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <p className="text-sm font-medium text-foreground mb-1">Document type:</p>
                      <p className="text-sm text-muted-foreground">{getDocumentTypeLabel(selectedDocumentType)}</p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="document-file">Bestand</Label>
                    <Input
                      id="document-file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Geselecteerd: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleDocumentUpload}
                    disabled={!selectedFile || !selectedDocumentType || uploadingDocument}
                    className="w-full"
                  >
                    {uploadingDocument ? "Uploaden..." : "Uploaden"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

