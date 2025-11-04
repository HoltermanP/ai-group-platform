"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function AISchouwPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectIdFilter, setProjectIdFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    status?: string;
    readinessStatus?: string;
    connectionType?: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    inspectionId: "",
    title: "",
    description: "",
    projectId: "",
    connectionTypes: [] as string[],
    location: "",
    coordinates: "",
    inspectionDate: "",
    notes: "",
  });

  // Lees filters uit URL query parameters
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const readinessStatus = searchParams.get('readinessStatus');
    const connectionType = searchParams.get('connectionType');
    
    setProjectIdFilter(projectId);
    setFilters({
      status: status || undefined,
      readinessStatus: readinessStatus || undefined,
      connectionType: connectionType || undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  // Stel het project in als er een filter is
  useEffect(() => {
    if (projectIdFilter) {
      setFormData((prev) => ({
        ...prev,
        projectId: projectIdFilter,
      }));
    }
  }, [projectIdFilter]);

  // Genereer automatisch een schouw ID
  useEffect(() => {
    if (!formData.inspectionId && !showForm) {
      const year = new Date().getFullYear();
      // Genereer een tijdelijk ID, wordt later vervangen door server-side generatie
      const tempId = `SCH-${year}-000`;
      setFormData((prev) => ({ ...prev, inspectionId: tempId }));
    }
  }, [showForm]);

  const fetchInspections = async () => {
    try {
      const response = await fetch("/api/inspections");
      if (response.ok) {
        const data = await response.json();
        setInspections(data);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const generateInspectionId = () => {
    const year = new Date().getFullYear();
    // Haal laatste nummer op (vereist backend call, maar voor nu gebruiken we een simpele versie)
    const randomNum = Math.floor(Math.random() * 1000);
    return `SCH-${year}-${String(randomNum).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Genereer inspection ID als deze leeg is
      const inspectionId = formData.inspectionId || generateInspectionId();

      const response = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          inspectionId,
          projectId: parseInt(formData.projectId),
          connectionTypes: formData.connectionTypes.length > 0 ? formData.connectionTypes : null,
        }),
      });

      if (response.ok) {
        const newInspection = await response.json();

        // Als er foto's zijn, upload deze
        if (selectedPhotos.length > 0) {
          const photoFormData = new FormData();
          selectedPhotos.forEach((photo) => {
            photoFormData.append("photos", photo);
          });

          try {
            await fetch(`/api/inspections/${newInspection.id}/photos`, {
              method: "POST",
              body: photoFormData,
            });
          } catch (photoError) {
            console.error("Error uploading photos:", photoError);
            alert("Schouw aangemaakt, maar er was een probleem bij het uploaden van foto's.");
          }
        }

        // Reset form
        setFormData({
          inspectionId: "",
          title: "",
          description: "",
          projectId: projectIdFilter || "",
          connectionTypes: [],
          location: "",
          coordinates: "",
          inspectionDate: "",
          notes: "",
        });
        setSelectedPhotos([]);
        setShowForm(false);
        fetchInspections();
      } else {
        const error = await response.json();
        alert(error.error || "Er is een fout opgetreden bij het aanmaken van de schouw");
      }
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Er is een fout opgetreden bij het aanmaken van de schouw");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleConnectionTypeChange = (connectionType: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      connectionTypes: checked
        ? [...prev.connectionTypes, connectionType]
        : prev.connectionTypes.filter((type) => type !== connectionType),
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedPhotos([...selectedPhotos, ...files]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL");
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

  // Filter inspections
  const filteredInspections = inspections.filter((inspection) => {
    // Project filter
    if (projectIdFilter && inspection.projectId !== parseInt(projectIdFilter)) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        inspection.inspectionId.toLowerCase().includes(query) ||
        inspection.title.toLowerCase().includes(query) ||
        (inspection.description && inspection.description.toLowerCase().includes(query)) ||
        (inspection.location && inspection.location.toLowerCase().includes(query));
      if (!matches) return false;
    }

    // Status filter
    if (filters.status && inspection.status !== filters.status) {
      return false;
    }

    // Readiness status filter
    if (filters.readinessStatus && inspection.readinessStatus !== filters.readinessStatus) {
      return false;
    }

    // Connection type filter
    if (filters.connectionType) {
      const connectionTypes = inspection.connectionTypes
        ? JSON.parse(inspection.connectionTypes)
        : [];
      if (!Array.isArray(connectionTypes) || !connectionTypes.includes(filters.connectionType)) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = searchQuery || projectIdFilter || Object.values(filters).some((v) => v !== undefined);

  const clearAllFilters = () => {
    setSearchQuery("");
    setProjectIdFilter(null);
    setFilters({});
    router.push("/dashboard/ai-schouw");
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">AI Schouwen</h1>
              <p className="text-muted-foreground">
                Beheer schouwen voor aansluitleidingen op projecten
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                {showForm ? "Annuleren" : "+ Nieuwe Schouw"}
              </button>
            </div>
          </div>

          {/* Create Inspection Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6 text-card-foreground">
                Nieuwe Schouw
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Schouw ID */}
                  <div>
                    <label htmlFor="inspectionId" className="block text-sm font-medium mb-2 text-foreground">
                      Schouw ID *
                    </label>
                    <input
                      type="text"
                      id="inspectionId"
                      name="inspectionId"
                      value={formData.inspectionId}
                      onChange={handleChange}
                      required
                      placeholder="SCH-2024-001"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Titel */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-2 text-foreground">
                      Titel *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="Schouw aansluitleidingen"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Project */}
                  <div>
                    <label htmlFor="projectId" className="block text-sm font-medium mb-2 text-foreground">
                      Project *
                    </label>
                    <select
                      id="projectId"
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="">Selecteer een project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectId} - {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Schouwdatum */}
                  <div>
                    <label htmlFor="inspectionDate" className="block text-sm font-medium mb-2 text-foreground">
                      Schouwdatum
                    </label>
                    <input
                      type="date"
                      id="inspectionDate"
                      name="inspectionDate"
                      value={formData.inspectionDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Type Aansluiting */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Type Aansluiting *
                    </label>
                    <div className="flex gap-4">
                      {["elektra", "gas", "water"].map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.connectionTypes.includes(type)}
                            onChange={(e) => handleConnectionTypeChange(type, e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-foreground capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Locatie */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium mb-2 text-foreground">
                      Locatie/Adres
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Kalverstraat 1, Amsterdam"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Coördinaten */}
                  <div>
                    <label htmlFor="coordinates" className="block text-sm font-medium mb-2 text-foreground">
                      GPS Coördinaten
                    </label>
                    <input
                      type="text"
                      id="coordinates"
                      name="coordinates"
                      value={formData.coordinates}
                      onChange={handleChange}
                      placeholder="52.3676, 4.9041"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Foto's */}
                  <div className="md:col-span-2">
                    <label htmlFor="photos" className="block text-sm font-medium mb-2 text-foreground">
                      Foto's
                    </label>
                    <input
                      type="file"
                      id="photos"
                      name="photos"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                    {selectedPhotos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedPhotos.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm">
                            <span className="text-foreground">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="text-destructive hover:text-destructive/80 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecteer een of meerdere foto's (max 5MB per foto)
                    </p>
                  </div>
                </div>

                {/* Beschrijving */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2 text-foreground">
                    Beschrijving
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Beschrijf de schouw in detail..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Notities */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-2 text-foreground">
                    Notities
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Algemene notities bij de schouw..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                  >
                    {isCreating ? "Aanmaken..." : "Schouw Aanmaken"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        inspectionId: "",
                        title: "",
                        description: "",
                        projectId: projectIdFilter || "",
                        connectionTypes: [],
                        location: "",
                        coordinates: "",
                        inspectionDate: "",
                        notes: "",
                      });
                      setSelectedPhotos([]);
                    }}
                    className="px-6 py-2 rounded-md border border-border hover:bg-accent transition-colors font-medium"
                  >
                    Annuleren
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          {hasActiveFilters && (
            <div className="mb-6 bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Actieve Filters</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Alle filters verwijderen
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectIdFilter && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="text-primary">
                      {projects.find((p) => p.id === parseInt(projectIdFilter))?.name || projectIdFilter}
                    </span>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="text-primary">{getStatusLabel(filters.status)}</span>
                  </span>
                )}
                {filters.readinessStatus && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Gereedheid:</span>
                    <span className="text-primary">{getReadinessStatusLabel(filters.readinessStatus)}</span>
                  </span>
                )}
                {filters.connectionType && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Type:</span>
                    <span className="text-primary capitalize">{filters.connectionType}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Inspections Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Schouwen</h2>
              {!isLoading && inspections.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {filteredInspections.length} van {inspections.length} {filteredInspections.length === 1 ? 'schouw' : 'schouwen'}
                </div>
              )}
            </div>

            {/* Search Bar */}
            {!isLoading && inspections.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Zoek op schouw ID, titel, beschrijving, locatie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Laden...</div>
            ) : filteredInspections.length === 0 && hasActiveFilters ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Geen schouwen gevonden met de geselecteerde filters
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Verwijder filters en bekijk alle schouwen →
                </button>
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Nog geen schouwen</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Maak je eerste schouw aan →
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Schouw ID
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Titel
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type Aansluiting
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Gereedheid
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Datum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInspections.map((inspection) => {
                        const project = projects.find((p) => p.id === inspection.projectId);
                        return (
                          <tr
                            key={inspection.id}
                            onClick={() => router.push(`/dashboard/ai-schouw/${inspection.id}`)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3 text-sm font-medium text-foreground">
                              {inspection.inspectionId}
                            </td>
                            <td className="px-3 py-3 text-sm text-foreground">{inspection.title}</td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {project ? `${project.projectId} - ${project.name}` : "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {getConnectionTypesLabel(inspection.connectionTypes)}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  inspection.status === "afgerond"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : inspection.status === "afgekeurd"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : inspection.status === "in_behandeling"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }`}
                              >
                                {getStatusLabel(inspection.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {getReadinessStatusLabel(inspection.readinessStatus)}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {formatDate(inspection.inspectionDate || inspection.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AISchouwPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-73px)] bg-background flex items-center justify-center">Laden...</div>}>
      <AISchouwPageContent />
    </Suspense>
  );
}

