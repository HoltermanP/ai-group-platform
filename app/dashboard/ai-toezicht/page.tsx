"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

// Kwaliteitsnormen voor toezicht
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

const qualityStandardOptions: Record<string, string[]> = {
  montage: ["excellent", "goed", "voldoende", "onvoldoende"],
  diepteligging: ["conform", "niet_conform"],
  werkmap: ["aanwezig", "niet_aanwezig"],
  volgensTekening: ["ja", "nee"],
  materiaalGebruik: ["excellent", "goed", "voldoende", "onvoldoende"],
  aarding: ["conform", "niet_conform"],
  drukproef: ["geslaagd", "niet_geslaagd"],
  lekdichtheid: ["lekdicht", "niet_lekdicht"],
  bescherming: ["voldoende", "onvoldoende"],
  markering: ["aanwezig", "niet_aanwezig"],
};

function AIToezichtPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectIdFilter, setProjectIdFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    status?: string;
    discipline?: string;
    overallQuality?: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    supervisionId: "",
    title: "",
    description: "",
    projectId: "",
    discipline: "",
    location: "",
    coordinates: "",
    supervisionDate: "",
    notes: "",
    qualityStandards: {} as Record<string, string>,
    overallQuality: "",
  });

  // Lees filters uit URL query parameters
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const discipline = searchParams.get('discipline');
    const overallQuality = searchParams.get('overallQuality');
    
    setProjectIdFilter(projectId);
    setFilters({
      status: status || undefined,
      discipline: discipline || undefined,
      overallQuality: overallQuality || undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    fetchSupervisions();
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

  const fetchSupervisions = async () => {
    try {
      const response = await fetch("/api/supervisions");
      if (response.ok) {
        const data = await response.json();
        setSupervisions(data);
      }
    } catch (error) {
      console.error("Error fetching supervisions:", error);
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

  const generateSupervisionId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000);
    return `TOZ-${year}-${String(randomNum).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const supervisionId = formData.supervisionId || generateSupervisionId();

      const response = await fetch("/api/supervisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          supervisionId,
          projectId: parseInt(formData.projectId),
          discipline: formData.discipline || null,
          qualityStandards: Object.keys(formData.qualityStandards).length > 0 ? formData.qualityStandards : null,
          overallQuality: formData.overallQuality || null,
        }),
      });

      if (response.ok) {
        const newSupervision = await response.json();

        // Als er foto's zijn, upload deze
        if (selectedPhotos.length > 0) {
          const photoFormData = new FormData();
          selectedPhotos.forEach((photo) => {
            photoFormData.append("photos", photo);
          });

          try {
            await fetch(`/api/supervisions/${newSupervision.id}/photos`, {
              method: "POST",
              body: photoFormData,
            });
          } catch (photoError) {
            console.error("Error uploading photos:", photoError);
            alert("Toezicht aangemaakt, maar er was een probleem bij het uploaden van foto's.");
          }
        }

        // Reset form
        setFormData({
          supervisionId: "",
          title: "",
          description: "",
          projectId: projectIdFilter || "",
          discipline: "",
          location: "",
          coordinates: "",
          supervisionDate: "",
          notes: "",
          qualityStandards: {},
          overallQuality: "",
        });
        setSelectedPhotos([]);
        setShowForm(false);
        fetchSupervisions();
      } else {
        const error = await response.json();
        alert(error.error || "Er is een fout opgetreden bij het aanmaken van het toezicht");
      }
    } catch (error) {
      console.error("Error creating supervision:", error);
      alert("Er is een fout opgetreden bij het aanmaken van het toezicht");
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

  const handleQualityStandardChange = (standard: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      qualityStandards: {
        ...prev.qualityStandards,
        [standard]: value,
      },
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

  const getQualityStandardLabel = (key: string, value: string) => {
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
    return getQualityLabel(value);
  };

  const getQualityStandardsLabel = (qualityStandards: string | null) => {
    if (!qualityStandards) return "-";
    try {
      const standards = JSON.parse(qualityStandards);
      const entries = Object.entries(standards);
      if (entries.length === 0) return "-";
      return `${entries.length} norm${entries.length > 1 ? 'en' : ''} beoordeeld`;
    } catch {
      return "-";
    }
  };

  // Filter supervisions
  const filteredSupervisions = supervisions.filter((supervision) => {
    // Project filter
    if (projectIdFilter && supervision.projectId !== parseInt(projectIdFilter)) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        supervision.supervisionId.toLowerCase().includes(query) ||
        supervision.title.toLowerCase().includes(query) ||
        (supervision.description && supervision.description.toLowerCase().includes(query)) ||
        (supervision.location && supervision.location.toLowerCase().includes(query));
      if (!matches) return false;
    }

    // Status filter
    if (filters.status && supervision.status !== filters.status) {
      return false;
    }

    // Discipline filter
    if (filters.discipline && supervision.discipline !== filters.discipline) {
      return false;
    }

    // Overall quality filter
    if (filters.overallQuality && supervision.overallQuality !== filters.overallQuality) {
      return false;
    }

    return true;
  });

  const hasActiveFilters = searchQuery || projectIdFilter || Object.values(filters).some((v) => v !== undefined);

  const clearAllFilters = () => {
    setSearchQuery("");
    setProjectIdFilter(null);
    setFilters({});
    router.push("/dashboard/ai-toezicht");
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">AI Toezicht</h1>
              <p className="text-muted-foreground">
                Kwaliteitscontrole en toezicht op projecten
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/dashboard/ai-toezicht/analytics"
                className="px-6 py-3 rounded-md border border-border hover:bg-accent transition-colors font-medium text-foreground shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Rapportage
              </a>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                {showForm ? "Annuleren" : "+ Nieuw Toezicht"}
              </button>
            </div>
          </div>

          {/* Create Supervision Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6 text-card-foreground">
                Nieuw Toezicht
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Toezicht ID */}
                  <div>
                    <label htmlFor="supervisionId" className="block text-sm font-medium mb-2 text-foreground">
                      Toezicht ID *
                    </label>
                    <input
                      type="text"
                      id="supervisionId"
                      name="supervisionId"
                      value={formData.supervisionId}
                      onChange={handleChange}
                      required
                      placeholder="TOZ-2024-001"
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
                      placeholder="Kwaliteitscontrole project"
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

                  {/* Discipline */}
                  <div>
                    <label htmlFor="discipline" className="block text-sm font-medium mb-2 text-foreground">
                      Discipline
                    </label>
                    <select
                      id="discipline"
                      name="discipline"
                      value={formData.discipline}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="">Selecteer discipline</option>
                      <option value="Elektra">Elektra</option>
                      <option value="Gas">Gas</option>
                      <option value="Water">Water</option>
                      <option value="Media">Media</option>
                    </select>
                  </div>

                  {/* Toezichtdatum */}
                  <div>
                    <label htmlFor="supervisionDate" className="block text-sm font-medium mb-2 text-foreground">
                      Toezichtdatum
                    </label>
                    <input
                      type="date"
                      id="supervisionDate"
                      name="supervisionDate"
                      value={formData.supervisionDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Algemene Kwaliteit */}
                  <div>
                    <label htmlFor="overallQuality" className="block text-sm font-medium mb-2 text-foreground">
                      Algemene Kwaliteit
                    </label>
                    <select
                      id="overallQuality"
                      name="overallQuality"
                      value={formData.overallQuality}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="">Selecteer kwaliteit</option>
                      <option value="excellent">Excellent</option>
                      <option value="goed">Goed</option>
                      <option value="voldoende">Voldoende</option>
                      <option value="onvoldoende">Onvoldoende</option>
                    </select>
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
                </div>

                {/* Kwaliteitsnormen */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-4 text-foreground">
                    Kwaliteitsnormen
                  </label>
                  <div className="grid gap-4 md:grid-cols-2 border border-border rounded-lg p-4 bg-muted/30">
                    {Object.entries(qualityStandardLabels).map(([key, label]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{label}</label>
                        <select
                          value={formData.qualityStandards[key] || ""}
                          onChange={(e) => handleQualityStandardChange(key, e.target.value)}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                        >
                          <option value="">Niet beoordeeld</option>
                          {qualityStandardOptions[key]?.map((option) => (
                            <option key={option} value={option}>
                              {getQualityStandardLabel(key, option)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
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
                    placeholder="Beschrijf het toezicht in detail..."
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
                    placeholder="Algemene notities bij het toezicht..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Foto's */}
                <div>
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

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                  >
                    {isCreating ? "Aanmaken..." : "Toezicht Aanmaken"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        supervisionId: "",
                        title: "",
                        description: "",
                        projectId: projectIdFilter || "",
                        discipline: "",
                        location: "",
                        coordinates: "",
                        supervisionDate: "",
                        notes: "",
                        qualityStandards: {},
                        overallQuality: "",
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
                {filters.discipline && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Discipline:</span>
                    <span className="text-primary">{filters.discipline}</span>
                  </span>
                )}
                {filters.overallQuality && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Kwaliteit:</span>
                    <span className="text-primary">{getQualityLabel(filters.overallQuality)}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Supervisions Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Toezichten</h2>
              {!isLoading && supervisions.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {filteredSupervisions.length} van {supervisions.length} {filteredSupervisions.length === 1 ? 'toezicht' : 'toezichten'}
                </div>
              )}
            </div>

            {/* Search Bar */}
            {!isLoading && supervisions.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Zoek op toezicht ID, titel, beschrijving, locatie..."
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
            ) : filteredSupervisions.length === 0 && hasActiveFilters ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Geen toezichten gevonden met de geselecteerde filters
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Verwijder filters en bekijk alle toezichten →
                </button>
              </div>
            ) : supervisions.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Nog geen toezichten</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Maak je eerste toezicht aan →
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Toezicht ID
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Titel
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Discipline
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Kwaliteit
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Normen
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Datum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSupervisions.map((supervision) => {
                        const project = projects.find((p) => p.id === supervision.projectId);
                        return (
                          <tr
                            key={supervision.id}
                            onClick={() => router.push(`/dashboard/ai-toezicht/${supervision.id}`)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3 text-sm font-medium text-foreground">
                              {supervision.supervisionId}
                            </td>
                            <td className="px-3 py-3 text-sm text-foreground">{supervision.title}</td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {project ? `${project.projectId} - ${project.name}` : "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {supervision.discipline || "-"}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  supervision.status === "afgerond"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : supervision.status === "afgekeurd"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : supervision.status === "in_behandeling"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }`}
                              >
                                {getStatusLabel(supervision.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {getQualityLabel(supervision.overallQuality)}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {getQualityStandardsLabel(supervision.qualityStandards)}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {formatDate(supervision.supervisionDate || supervision.createdAt)}
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

export default function AIToezichtPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-73px)] bg-background flex items-center justify-center">Laden...</div>}>
      <AIToezichtPageContent />
    </Suspense>
  );
}

