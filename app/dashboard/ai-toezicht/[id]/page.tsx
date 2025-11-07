"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Supervision {
  id: number;
  supervisionId: string;
  title: string;
  description: string | null;
  projectId: number;
  discipline: string | null;
  status: string;
  overallQuality: string | null;
  qualityStandards: string | null;
  location: string | null;
  coordinates: string | null;
  supervisedBy: string;
  assignedTo: string | null;
  supervisionDate: string | null;
  photos: string | null;
  notes: string | null;
  findings: string | null;
  recommendations: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  projectId: string;
  name: string;
}

const qualityStandardLabels: Record<string, string> = {
  montage: "Montage kwaliteit",
  diepteligging: "Diepteligging",
  werkmap: "Aanwezigheid werkmap",
  volgensTekening: "Uitgevoerd volgens tekening",
  materiaalGebruik: "Materiaalgebruik",
  aarding: "Aarding (voor elektra)",
  drukproef: "Drukproef (voor gas/water)",
  lekdichtheid: "Lekdichtheid",
  bescherming: "Bescherming leidingen",
  markering: "Markering en bebording",
};

function getQualityStandardLabel(key: string, value: string): string {
  if (value === "conform") return "Conform";
  if (value === "niet_conform") return "Niet Conform";
  if (value === "aanwezig") return "Aanwezig";
  if (value === "niet_aanwezig") return "Niet Aanwezig";
  if (value === "ja") return "Ja";
  if (value === "nee") return "Nee";
  if (value === "geslaagd") return "Geslaagd";
  if (value === "niet_geslaagd") return "Niet Geslaagd";
  if (value === "lekdicht") return "Lekdicht";
  if (value === "niet_lekdicht") return "Niet Lekdicht";
  if (value === "voldoende") return "Voldoende";
  if (value === "onvoldoende") return "Onvoldoende";
  if (value === "excellent") return "Excellent";
  if (value === "goed") return "Goed";
  return value;
}

export default function SupervisionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [supervision, setSupervision] = useState<Supervision | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoInput, setPhotoInput] = useState<File[]>([]);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchSupervision(id);
    }
  }, [params.id]);

  const fetchSupervision = async (id: string) => {
    try {
      const response = await fetch(`/api/supervisions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSupervision(data);
        
        // Haal project op
        if (data.projectId) {
          const projectResponse = await fetch(`/api/projects/${data.projectId}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            setProject(projectData);
          }
        }
      } else {
        setError("Toezicht niet gevonden");
      }
    } catch (error) {
      console.error("Error fetching supervision:", error);
      setError("Er is een fout opgetreden bij het ophalen van het toezicht");
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open",
      in_behandeling: "In Behandeling",
      afgerond: "Afgerond",
      afgekeurd: "Afgekeurd",
    };
    return labels[status] || status;
  };

  const getQualityLabel = (quality: string | null) => {
    if (!quality) return "-";
    const labels: Record<string, string> = {
      excellent: "Excellent",
      goed: "Goed",
      voldoende: "Voldoende",
      onvoldoende: "Onvoldoende",
    };
    return labels[quality] || quality;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      in_behandeling: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      afgerond: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      afgekeurd: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getQualityColor = (quality: string | null) => {
    if (!quality) return "bg-muted text-muted-foreground";
    const colors: Record<string, string> = {
      excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      goed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      voldoende: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      onvoldoende: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[quality] || "bg-muted text-muted-foreground";
  };

  const parsePhotos = (photosString: string | null): string[] => {
    if (!photosString) return [];
    try {
      const photos = JSON.parse(photosString);
      return Array.isArray(photos) 
        ? photos.map((url: string) => 
            url.startsWith('http') ? url : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`
          )
        : [];
    } catch {
      return [];
    }
  };

  const parseQualityStandards = (standardsString: string | null): Record<string, string> => {
    if (!standardsString) return {};
    try {
      const parsed = JSON.parse(standardsString);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
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
      const response = await fetch(`/api/supervisions/${id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSupervision({ ...supervision!, photos: JSON.stringify(data.photos) });
        setPhotoInput([]);
        // Refresh de supervision data
        fetchSupervision(id);
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

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12 text-muted-foreground">Laden...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !supervision) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error || "Toezicht niet gevonden"}</p>
              <Link
                href="/dashboard/ai-toezicht"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Terug naar AI Toezicht
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qualityStandards = parseQualityStandards(supervision.qualityStandards);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/ai-toezicht"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar AI Toezicht
            </Link>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-foreground">{supervision.title}</h1>
                </div>
                <p className="text-muted-foreground">Toezicht ID: {supervision.supervisionId}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(supervision.status)}`}
              >
                {getStatusLabel(supervision.status)}
              </span>
              {supervision.overallQuality && (
                <span
                  className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${getQualityColor(supervision.overallQuality)}`}
                >
                  Kwaliteit: {getQualityLabel(supervision.overallQuality)}
                </span>
              )}
              {supervision.discipline && (
                <span className="inline-flex px-3 py-1 rounded-md text-sm font-medium border bg-muted/50 text-foreground border-border">
                  {supervision.discipline}
                </span>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Toezicht Details */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Toezicht Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground font-medium">{getStatusLabel(supervision.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Algemene Kwaliteit</p>
                  <p className="text-foreground font-medium">
                    {getQualityLabel(supervision.overallQuality)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Discipline</p>
                  <p className="text-foreground font-medium">
                    {supervision.discipline || "-"}
                  </p>
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
                {supervision.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Adres</p>
                    <p className="text-foreground font-medium">{supervision.location}</p>
                  </div>
                )}
                {supervision.coordinates && (
                  <div>
                    <p className="text-sm text-muted-foreground">GPS Coördinaten</p>
                    <p className="text-foreground font-medium font-mono text-sm">
                      {supervision.coordinates}
                    </p>
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
                {supervision.supervisionDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Toezichtdatum</p>
                    <p className="text-foreground font-medium">
                      {formatDate(supervision.supervisionDate)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Aangemaakt</p>
                  <p className="text-foreground font-medium">{formatDate(supervision.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Laatst bijgewerkt</p>
                  <p className="text-foreground font-medium">{formatDate(supervision.updatedAt)}</p>
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
                {project ? (
                  <Link
                    href={`/dashboard/projects/${supervision.projectId}`}
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {project.projectId} - {project.name} →
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Project laden...</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {supervision.description && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Beschrijving</h2>
              <p className="text-foreground whitespace-pre-wrap">{supervision.description}</p>
            </div>
          )}

          {/* Notes */}
          {supervision.notes && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Notities</h2>
              <p className="text-foreground whitespace-pre-wrap">{supervision.notes}</p>
            </div>
          )}

          {/* Kwaliteitsnormen */}
          {Object.keys(qualityStandards).length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Kwaliteitsnormen</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(qualityStandards).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                  >
                    <span className="text-foreground font-medium">
                      {qualityStandardLabels[key] || key}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        value === "excellent" || value === "conform" || value === "ja" || value === "aanwezig" || value === "geslaagd" || value === "lekdicht"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : value === "goed" || value === "voldoende"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {getQualityStandardLabel(key, value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bevindingen */}
          {supervision.findings && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Bevindingen en Afwijkingen</h2>
              <p className="text-foreground whitespace-pre-wrap">{supervision.findings}</p>
            </div>
          )}

          {/* Aanbevelingen */}
          {supervision.recommendations && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Aanbevelingen voor Verbetering</h2>
              <p className="text-foreground whitespace-pre-wrap">{supervision.recommendations}</p>
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
                  capture="environment"
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
                const photos = parsePhotos(supervision.photos);
                if (photos.length > 0) {
                  return (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4 text-foreground">Geüploade Foto's</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {photos.map((photoUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`Foto ${index + 1} van toezicht ${supervision.supervisionId}`}
                              className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(photoUrl, "_blank")}
                              loading="lazy"
                              decoding="async"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.startsWith('http')) {
                                  target.src = `${window.location.origin}${photoUrl}`;
                                }
                              }}
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
        </div>
      </div>
    </div>
  );
}

