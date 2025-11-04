"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Inspection {
  id: number;
  inspectionId: string;
  title: string;
  description: string | null;
  projectId: number;
  connectionTypes: string | null;
  status: string;
  readinessStatus: string | null;
  checklist: string | null;
  location: string | null;
  coordinates: string | null;
  inspectedBy: string;
  assignedTo: string | null;
  inspectionDate: string | null;
  photos: string | null;
  notes: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  projectId: string;
  name: string;
}

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoInput, setPhotoInput] = useState<File[]>([]);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchInspection(id);
    }
  }, [params.id]);

  const fetchInspection = async (id: string) => {
    try {
      const response = await fetch(`/api/inspections/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInspection(data);
        
        // Haal project op
        if (data.projectId) {
          const projectResponse = await fetch(`/api/projects/${data.projectId}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            setProject(projectData);
          }
        }
      } else {
        setError("Schouw niet gevonden");
      }
    } catch (error) {
      console.error("Error fetching inspection:", error);
      setError("Er is een fout opgetreden bij het ophalen van de schouw");
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

  const getReadinessStatusLabel = (status: string | null) => {
    if (!status) return "-";
    const labels: Record<string, string> = {
      goedgekeurd: "Goedgekeurd",
      afgekeurd: "Afgekeurd",
      in_beoordeling: "In Beoordeling",
    };
    return labels[status] || status;
  };

  const getConnectionTypesLabel = (connectionTypes: string | null) => {
    if (!connectionTypes) return "-";
    try {
      const types = JSON.parse(connectionTypes);
      return Array.isArray(types) ? types.join(", ") : connectionTypes;
    } catch {
      return connectionTypes;
    }
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

  const getReadinessStatusColor = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground";
    const colors: Record<string, string> = {
      goedgekeurd: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      afgekeurd: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      in_beoordeling: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
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

  const parseChecklist = (checklistString: string | null): Array<{ id: string; item: string; checked: boolean }> => {
    if (!checklistString) return [];
    try {
      const parsed = JSON.parse(checklistString);
      return Array.isArray(parsed) ? parsed : [];
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
      const response = await fetch(`/api/inspections/${id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setInspection({ ...inspection!, photos: JSON.stringify(data.photos) });
        setPhotoInput([]);
        // Refresh de inspection data
        fetchInspection(id);
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

  if (error || !inspection) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error || "Schouw niet gevonden"}</p>
              <Link
                href="/dashboard/ai-schouw"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Terug naar AI Schouwen
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checklist = parseChecklist(inspection.checklist);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/ai-schouw"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar AI Schouwen
            </Link>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-foreground">{inspection.title}</h1>
                </div>
                <p className="text-muted-foreground">Schouw ID: {inspection.inspectionId}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(inspection.status)}`}
              >
                {getStatusLabel(inspection.status)}
              </span>
              {inspection.readinessStatus && (
                <span
                  className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${getReadinessStatusColor(inspection.readinessStatus)}`}
                >
                  {getReadinessStatusLabel(inspection.readinessStatus)}
                </span>
              )}
              <span className="inline-flex px-3 py-1 rounded-md text-sm font-medium border bg-muted/50 text-foreground border-border">
                {getConnectionTypesLabel(inspection.connectionTypes)}
              </span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Schouw Details */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Schouw Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground font-medium">{getStatusLabel(inspection.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gereedheid</p>
                  <p className="text-foreground font-medium">
                    {getReadinessStatusLabel(inspection.readinessStatus)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type Aansluiting</p>
                  <p className="text-foreground font-medium">
                    {getConnectionTypesLabel(inspection.connectionTypes)}
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
                {inspection.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Adres</p>
                    <p className="text-foreground font-medium">{inspection.location}</p>
                  </div>
                )}
                {inspection.coordinates && (
                  <div>
                    <p className="text-sm text-muted-foreground">GPS Coördinaten</p>
                    <p className="text-foreground font-medium font-mono text-sm">
                      {inspection.coordinates}
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
                {inspection.inspectionDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Schouwdatum</p>
                    <p className="text-foreground font-medium">
                      {formatDate(inspection.inspectionDate)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Aangemaakt</p>
                  <p className="text-foreground font-medium">{formatDate(inspection.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Laatst bijgewerkt</p>
                  <p className="text-foreground font-medium">{formatDate(inspection.updatedAt)}</p>
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
                    href={`/dashboard/projects/${inspection.projectId}`}
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
          {inspection.description && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Beschrijving</h2>
              <p className="text-foreground whitespace-pre-wrap">{inspection.description}</p>
            </div>
          )}

          {/* Notes */}
          {inspection.notes && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Notities</h2>
              <p className="text-foreground whitespace-pre-wrap">{inspection.notes}</p>
            </div>
          )}

          {/* Remarks */}
          {inspection.remarks && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Opmerkingen/Bevindingen</h2>
              <p className="text-foreground whitespace-pre-wrap">{inspection.remarks}</p>
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Checklist</h2>
              <div className="space-y-2">
                {checklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className={`text-foreground ${item.checked ? "line-through opacity-60" : ""}`}>
                      {item.item}
                    </span>
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
                const photos = parsePhotos(inspection.photos);
                if (photos.length > 0) {
                  return (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4 text-foreground">Geüploade Foto's</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {photos.map((photoUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photoUrl}
                              alt={`Foto ${index + 1} van schouw ${inspection.inspectionId}`}
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
        </div>
      </div>
    </div>
  );
}

