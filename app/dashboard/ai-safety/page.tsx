"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SafetyIncident {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority: string;
  discipline: string | null;
  location: string | null;
  projectId: number | null;
  impact: string | null;
  mitigation: string | null;
  affectedSystems: string | null;
  reportedBy: string;
  assignedTo: string | null;
  detectedDate: string | null;
  reportedDate: string;
  resolvedDate: string | null;
  tags: string | null;
  externalReference: string | null;
  photos: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  projectId: string;
  name: string;
}

function AISafetyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectIdFilter, setProjectIdFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    severity?: string;
    status?: string;
    category?: string;
    discipline?: string;
    location?: string;
    month?: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isCreatingToolbox, setIsCreatingToolbox] = useState(false);
  const [formData, setFormData] = useState({
    incidentId: "",
    title: "",
    description: "",
    category: "graafschade",
    severity: "medium",
    priority: "medium",
    discipline: "Elektra",
    location: "",
    coordinates: "",
    depth: "",
    projectId: "",
    impact: "",
    mitigation: "",
    affectedSystems: "",
    safetyMeasures: "",
    riskAssessment: "",
    contractor: "",
    assignedTo: "",
    detectedDate: "",
    tags: "",
    externalReference: "",
  });

  // Lees filters uit URL query parameters - update when searchParams change
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const discipline = searchParams.get('discipline');
    const location = searchParams.get('location');
    const month = searchParams.get('month');
    
    setProjectIdFilter(projectId);
    setFilters({
      severity: severity || undefined,
      status: status || undefined,
      category: category || undefined,
      discipline: discipline || undefined,
      location: location || undefined,
      month: month || undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    fetchIncidents();
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

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/safety-incidents");
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/safety-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId ? parseInt(formData.projectId) : null,
        }),
      });

      if (response.ok) {
        const newIncident = await response.json();

        // Als er foto's zijn, upload deze
        if (selectedPhotos.length > 0) {
          const photoFormData = new FormData();
          selectedPhotos.forEach((photo) => {
            photoFormData.append("photos", photo);
          });

          try {
            await fetch(`/api/safety-incidents/${newIncident.id}/photos`, {
              method: "POST",
              body: photoFormData,
            });
          } catch (photoError) {
            console.error("Error uploading photos:", photoError);
            // Laat de gebruiker weten dat het incident is aangemaakt maar foto's niet zijn geüpload
            alert("Incident aangemaakt, maar er was een probleem bij het uploaden van foto's.");
          }
        }

        // Reset form
        setFormData({
          incidentId: "",
          title: "",
          description: "",
          category: "graafschade",
          severity: "medium",
          priority: "medium",
          discipline: "Elektra",
          location: "",
          coordinates: "",
          depth: "",
          projectId: "",
          impact: "",
          mitigation: "",
          affectedSystems: "",
          safetyMeasures: "",
          riskAssessment: "",
          contractor: "",
          assignedTo: "",
          detectedDate: "",
          tags: "",
          externalReference: "",
        });
        setSelectedPhotos([]);
        setShowForm(false);
        fetchIncidents();
      }
    } catch (error) {
      console.error("Error creating incident:", error);
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

  const getDisciplineLabel = (type: string) => {
    const labels: Record<string, string> = {
      "Elektra": "Elektra",
      "Gas": "Gas",
      "Water": "Water",
      "Media": "Media",
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

  // Filter incidents op basis van alle actieve filters
  const filteredIncidents = incidents.filter((incident) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        incident.incidentId.toLowerCase().includes(query) ||
        incident.title.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        incident.category.toLowerCase().includes(query) ||
        incident.severity.toLowerCase().includes(query) ||
        incident.status.toLowerCase().includes(query) ||
        (incident.location && incident.location.toLowerCase().includes(query)) ||
        (incident.discipline && incident.discipline.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Project filter
    if (projectIdFilter && incident.projectId !== parseInt(projectIdFilter)) {
      return false;
    }
    
    // Severity filter
    if (filters.severity && incident.severity !== filters.severity) {
      return false;
    }
    
    // Status filter
    if (filters.status && incident.status !== filters.status) {
      return false;
    }
    
    // Category filter
    if (filters.category && incident.category !== filters.category) {
      return false;
    }
    
    // Discipline filter
    if (filters.discipline && incident.discipline !== filters.discipline) {
      return false;
    }
    
    // Location filter - gebruik het juiste location veld
    if (filters.location && incident.location !== filters.location) {
      return false;
    }
    
    // Month filter - check if reportedDate is in the specified month
    if (filters.month && incident.reportedDate) {
      const incidentDate = new Date(incident.reportedDate);
      // Vergelijk jaar en maand (0-indexed)
      const incidentYear = incidentDate.getFullYear();
      const incidentMonth = incidentDate.getMonth();
      
      // Parse filter month - kan verschillende formaten hebben
      // Format kan zijn: "2024 nov" of "nov. 2024" afhankelijk van locale
      const filterMonth = filters.month.toLowerCase().trim();
      
      // Converteer Nederlandse maandnaam naar maandnummer (0-indexed)
      const monthMap: Record<string, number> = {
        'jan': 0, 'januari': 0,
        'feb': 1, 'februari': 1,
        'mrt': 2, 'maart': 2, 'mar': 2,
        'apr': 3, 'april': 3,
        'mei': 4,
        'jun': 5, 'juni': 5,
        'jul': 6, 'juli': 6,
        'aug': 7, 'augustus': 7,
        'sep': 8, 'september': 8,
        'okt': 9, 'oktober': 9, 'oct': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11
      };
      
      // Probeer verschillende formaten te parsen
      let filterYear: number | null = null;
      let filterMonthNum: number | null = null;
      
      // Format: "2024 nov" of "nov 2024"
      const parts = filterMonth.split(/[\s.]+/);
      for (const part of parts) {
        const yearMatch = parseInt(part);
        if (yearMatch > 2000 && yearMatch < 2100) {
          filterYear = yearMatch;
        } else if (monthMap[part] !== undefined) {
          filterMonthNum = monthMap[part];
        }
      }
      
      // Debug log
      console.log('Month filter debug:', {
        filterMonth,
        parts,
        filterYear,
        filterMonthNum,
        incidentYear,
        incidentMonth,
        match: filterYear === incidentYear && filterMonthNum === incidentMonth
      });
      
      if (filterYear === null || filterMonthNum === null) {
        console.warn('Could not parse month filter:', filters.month);
        return true; // Als we niet kunnen parsen, laat door
      }
      
      if (incidentYear !== filterYear || incidentMonth !== filterMonthNum) {
        return false;
      }
    }
    
    return true;
  });

  // Vind het project dat wordt gefilterd
  const filteredProject = projectIdFilter
    ? projects.find((p) => p.id === parseInt(projectIdFilter))
    : null;
    
  // Check of er filters actief zijn
  const hasActiveFilters = searchQuery || projectIdFilter || Object.values(filters).some(v => v !== undefined);
  
  // Functie om alle filters te verwijderen
  const clearAllFilters = () => {
    setSearchQuery("");
    setProjectIdFilter(null);
    setFilters({});
    router.push("/dashboard/ai-safety");
  };

  // Toggle selectie van incident
  const toggleIncidentSelection = (incidentId: number) => {
    setSelectedIncidents((prev) => 
      prev.includes(incidentId)
        ? prev.filter(id => id !== incidentId)
        : [...prev, incidentId]
    );
  };

  // Selecteer alle of geen incidents
  const toggleSelectAll = () => {
    if (selectedIncidents.length === filteredIncidents.length) {
      setSelectedIncidents([]);
    } else {
      setSelectedIncidents(filteredIncidents.map(inc => inc.id));
    }
  };

  // Start AI analyse
  const handleAIAnalysis = async () => {
    if (selectedIncidents.length === 0) {
      alert("Selecteer minimaal één melding om te analyseren");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          incidentIds: selectedIncidents,
          save: true // Direct opslaan op overzichtspagina
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fout bij AI analyse");
      }

      const result = await response.json();
      setAiAnalysisResult(result);
      setShowAIAnalysis(true);
    } catch (error) {
      console.error("Error analyzing incidents:", error);
      alert(error instanceof Error ? error.message : "Er is een fout opgetreden bij de AI analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Maak toolbox vanuit AI advies
  const handleCreateToolbox = async (toolboxTopic: any) => {
    setIsCreatingToolbox(true);
    try {
      const response = await fetch("/api/toolboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Toolbox: ${toolboxTopic.topic}`,
          topic: toolboxTopic.topic,
          description: toolboxTopic.description,
          category: "veiligheid",
          generateWithAI: true,
          aiGenerated: true,
          sourceIncidentIds: selectedIncidents,
          aiAdvice: JSON.stringify(toolboxTopic),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fout bij het maken van toolbox");
      }

      alert("Toolbox succesvol aangemaakt!");
      setShowAIAnalysis(false);
      setSelectedIncidents([]);
    } catch (error) {
      console.error("Error creating toolbox:", error);
      alert(error instanceof Error ? error.message : "Er is een fout opgetreden bij het maken van de toolbox");
    } finally {
      setIsCreatingToolbox(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-foreground">Veiligheidsmeldingen</h1>
              <p className="text-muted-foreground">
                Beheer veiligheidsmeldingen voor ondergrondse infrastructuur
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {selectedIncidents.length > 0 && (
                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyseert...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Analyse ({selectedIncidents.length})
                    </>
                  )}
                </button>
              )}
              <a
                href="/dashboard/ai-safety/actions"
                className="px-6 py-3 rounded-md border border-border hover:bg-accent transition-colors font-medium text-foreground shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Acties
              </a>
              <a
                href="/dashboard/ai-safety/analytics"
                className="px-6 py-3 rounded-md border border-border hover:bg-accent transition-colors font-medium text-foreground shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analyses
              </a>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                {showForm ? "Annuleren" : "+ Nieuwe Melding"}
              </button>
            </div>
          </div>

          {/* Create Incident Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6 text-card-foreground">
                Nieuwe Veiligheidsmelding
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Incident ID */}
                  <div>
                    <label htmlFor="incidentId" className="block text-sm font-medium mb-2 text-foreground">
                      Incident ID *
                    </label>
                    <input
                      type="text"
                      id="incidentId"
                      name="incidentId"
                      value={formData.incidentId}
                      onChange={handleChange}
                      required
                      placeholder="SAFE-2024-001"
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
                      placeholder="Datalek in trainingsdata"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Categorie */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium mb-2 text-foreground">
                      Categorie *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="graafschade">Graafschade</option>
                      <option value="lekkage">Lekkage</option>
                      <option value="verzakking">Verzakking/Deformatie</option>
                      <option value="corrosie">Corrosie</option>
                      <option value="obstructie">Obstructie/Verstopping</option>
                      <option value="elektrisch">Elektrische Storing</option>
                      <option value="structureel">Structurele Schade</option>
                      <option value="verontreiniging">Bodemverontreiniging</option>
                      <option value="onderhoud">Onderhoud</option>
                      <option value="overig">Overig</option>
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
                      <option value="Elektra">Elektra</option>
                      <option value="Gas">Gas</option>
                      <option value="Water">Water</option>
                      <option value="Media">Media</option>
                    </select>
                  </div>

                  {/* Ernst */}
                  <div>
                    <label htmlFor="severity" className="block text-sm font-medium mb-2 text-foreground">
                      Ernst *
                    </label>
                    <select
                      id="severity"
                      name="severity"
                      value={formData.severity}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="low">Laag</option>
                      <option value="medium">Middel</option>
                      <option value="high">Hoog</option>
                      <option value="critical">Kritiek</option>
                    </select>
                  </div>

                  {/* Prioriteit */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium mb-2 text-foreground">
                      Prioriteit
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="low">Laag</option>
                      <option value="medium">Middel</option>
                      <option value="high">Hoog</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Project */}
                  <div>
                    <label htmlFor="projectId" className="block text-sm font-medium mb-2 text-foreground">
                      Gekoppeld Project (optioneel)
                    </label>
                    <select
                      id="projectId"
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="">Geen project (algemeen)</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectId} - {project.name}
                        </option>
                      ))}
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

                  {/* Diepte */}
                  <div>
                    <label htmlFor="depth" className="block text-sm font-medium mb-2 text-foreground">
                      Diepte (meters)
                    </label>
                    <input
                      type="text"
                      id="depth"
                      name="depth"
                      value={formData.depth}
                      onChange={handleChange}
                      placeholder="2.5"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Aannemer */}
                  <div>
                    <label htmlFor="contractor" className="block text-sm font-medium mb-2 text-foreground">
                      Aannemer/Uitvoerende Partij
                    </label>
                    <input
                      type="text"
                      id="contractor"
                      name="contractor"
                      value={formData.contractor}
                      onChange={handleChange}
                      placeholder="Bouwbedrijf XYZ"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Detectiedatum */}
                  <div>
                    <label htmlFor="detectedDate" className="block text-sm font-medium mb-2 text-foreground">
                      Detectiedatum
                    </label>
                    <input
                      type="date"
                      id="detectedDate"
                      name="detectedDate"
                      value={formData.detectedDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium mb-2 text-foreground">
                      Tags (komma-gescheiden)
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="spoed, KLIC, gevaarlijk"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Externe Referentie */}
                  <div>
                    <label htmlFor="externalReference" className="block text-sm font-medium mb-2 text-foreground">
                      Externe Referentie (KLIC/Ticket)
                    </label>
                    <input
                      type="text"
                      id="externalReference"
                      name="externalReference"
                      value={formData.externalReference}
                      onChange={handleChange}
                      placeholder="KLIC-2024-001234"
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
                    Beschrijving *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Beschrijf het incident in detail..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Impact */}
                <div>
                  <label htmlFor="impact" className="block text-sm font-medium mb-2 text-foreground">
                    Impact
                  </label>
                  <textarea
                    id="impact"
                    name="impact"
                    value={formData.impact}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Wat is de impact van dit incident?"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Mitigatie */}
                <div>
                  <label htmlFor="mitigation" className="block text-sm font-medium mb-2 text-foreground">
                    Genomen Maatregelen
                  </label>
                  <textarea
                    id="mitigation"
                    name="mitigation"
                    value={formData.mitigation}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Welke maatregelen zijn genomen of voorgesteld?"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Veiligheidsmaatregelen */}
                <div>
                  <label htmlFor="safetyMeasures" className="block text-sm font-medium mb-2 text-foreground">
                    Veiligheidsmaatregelen ter Plaatse
                  </label>
                  <textarea
                    id="safetyMeasures"
                    name="safetyMeasures"
                    value={formData.safetyMeasures}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Afzetting, signalering, verkeersmaatregelen, etc."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                {/* Risico Inschatting */}
                <div>
                  <label htmlFor="riskAssessment" className="block text-sm font-medium mb-2 text-foreground">
                    Risico Inschatting
                  </label>
                  <textarea
                    id="riskAssessment"
                    name="riskAssessment"
                    value={formData.riskAssessment}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Inschatting van risico's en mogelijke gevolgen"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isCreating ? "Aanmaken..." : "Melding Aanmaken"}
                </button>
              </form>
            </div>
          )}

          {/* Filter Indicators */}
          {hasActiveFilters && (
            <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-foreground">Actieve Filters:</div>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Alle filters verwijderen ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Zoeken:</span>
                    <span className="text-primary">"{searchQuery}"</span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-primary hover:text-primary/80"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {filteredProject && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="text-primary">{filteredProject.projectId} - {filteredProject.name}</span>
                  </span>
                )}
                {filters.severity && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Ernst:</span>
                    <span className="text-primary">{getSeverityLabel(filters.severity)}</span>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="text-primary">{getStatusLabel(filters.status)}</span>
                  </span>
                )}
                {filters.category && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Categorie:</span>
                    <span className="text-primary">{getCategoryLabel(filters.category)}</span>
                  </span>
                )}
                {filters.discipline && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Discipline:</span>
                    <span className="text-primary">{getDisciplineLabel(filters.discipline)}</span>
                  </span>
                )}
                {filters.location && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Locatie:</span>
                    <span className="text-primary">{filters.location}</span>
                  </span>
                )}
                {filters.month && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-primary/30 rounded-md text-sm">
                    <span className="font-medium">Maand:</span>
                    <span className="text-primary capitalize">{filters.month}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Incidents Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                Veiligheidsmeldingen
              </h2>
              {!isLoading && incidents.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {filteredIncidents.length} van {incidents.length} {filteredIncidents.length === 1 ? 'melding' : 'meldingen'}
                </div>
              )}
            </div>

            {/* Search Bar */}
            {!isLoading && incidents.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Zoek op incident ID, titel, beschrijving, categorie, ernst, status, locatie..."
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
            
            {/* Debug info - tijdelijk */}
            {filters.month && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm space-y-2">
                <div><strong>Debug Maandfilter:</strong></div>
                <div>• Filter waarde: "{filters.month}"</div>
                <div>• Totaal incidents in database: {incidents.length}</div>
                <div>• Na filtering: {filteredIncidents.length}</div>
                {incidents.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
                    <div className="font-semibold mb-1">Eerste 5 incident datums:</div>
                    {incidents.slice(0, 5).map((inc, idx) => {
                      const date = new Date(inc.reportedDate);
                      const formatted = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' });
                      return (
                        <div key={idx} className="text-xs">
                          {idx + 1}. {inc.incidentId}: {formatted} (maand: {date.getMonth()}, jaar: {date.getFullYear()})
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Algemene debug wanneer geen filters */}
            {!hasActiveFilters && incidents.length === 0 && !isLoading && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                <strong>⚠️ Geen incidents in database:</strong> Er zijn nog geen veiligheidsmeldingen aangemaakt. 
                Maak eerst enkele meldingen aan om de filtering te testen.
              </div>
            )}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Laden...
              </div>
            ) : filteredIncidents.length === 0 && hasActiveFilters ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Geen veiligheidsmeldingen gevonden met de geselecteerde filters
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Verwijder filters en bekijk alle meldingen →
                </button>
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Nog geen veiligheidsmeldingen</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Maak je eerste melding aan →
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block">
                  <p className="text-xs text-muted-foreground mb-2 text-right">
                    💡 Scroll horizontaal voor meer details
                  </p>
                  <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-12">
                              <input
                                type="checkbox"
                                checked={selectedIncidents.length === filteredIncidents.length && filteredIncidents.length > 0}
                                onChange={toggleSelectAll}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                              />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Melding
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Categorie
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Ernst
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Project
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Datum
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredIncidents.map((incident) => (
                            <tr
                              key={incident.id}
                              onClick={() => router.push(`/dashboard/ai-safety/${incident.id}`)}
                              className="hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                              {/* Checkbox */}
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIncidents.includes(incident.id)}
                                  onChange={() => toggleIncidentSelection(incident.id)}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                />
                              </td>
                              {/* ID + Titel */}
                              <td className="px-3 py-3">
                                <div className="text-xs text-muted-foreground mb-0.5">
                                  {incident.incidentId}
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                  {incident.title}
                                </div>
                                {incident.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {incident.description}
                                  </div>
                                )}
                              </td>

                              {/* Categorie */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-foreground">
                                  {getCategoryLabel(incident.category)}
                                </div>
                              </td>

                              {/* Ernst */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}
                                >
                                  {getSeverityLabel(incident.severity)}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(incident.status)}`}
                                >
                                  {getStatusLabel(incident.status)}
                                </span>
                              </td>

                              {/* Project */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-foreground">
                                  {incident.projectId ? (
                                    <span className="text-primary">#{incident.projectId}</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </td>

                              {/* Datum */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-foreground">
                                  {formatDate(incident.reportedDate)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile Card View - Hidden on desktop */}
                <div className="md:hidden space-y-4">
                  {filteredIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      onClick={() => router.push(`/dashboard/ai-safety/${incident.id}`)}
                      className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="checkbox"
                          checked={selectedIncidents.includes(incident.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleIncidentSelection(incident.id);
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary mt-1 mr-2"
                        />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">
                            {incident.incidentId}
                          </div>
                          <h3 className="text-base font-semibold text-foreground">
                            {incident.title}
                          </h3>
                          {incident.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {incident.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}
                        >
                          {getSeverityLabel(incident.severity)}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(incident.status)}`}
                        >
                          {getStatusLabel(incident.status)}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Categorie */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Categorie</div>
                          <div className="text-foreground font-medium">
                            {getCategoryLabel(incident.category)}
                          </div>
                        </div>

                        {/* Project */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Project</div>
                          <div className="text-foreground font-medium">
                            {incident.projectId ? (
                              <span className="text-primary">Project #{incident.projectId}</span>
                            ) : (
                              <span className="text-muted-foreground">Algemeen</span>
                            )}
                          </div>
                        </div>

                        {/* Gemeld op */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Gemeld op</div>
                          <div className="text-foreground">
                            {formatDate(incident.reportedDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Analyse Dialog */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Analyse Resultaten</DialogTitle>
            <DialogDescription>
              Analyse van {selectedIncidents.length} geselecteerde veiligheidsmelding(en)
            </DialogDescription>
          </DialogHeader>

          {aiAnalysisResult && (
            <div className="space-y-6 mt-4">
              {/* Samenvatting */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Samenvatting</h3>
                <p className="text-foreground whitespace-pre-wrap">{aiAnalysisResult.summary}</p>
              </div>

              {/* Aanbevelingen */}
              <div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Aanbevelingen</h3>
                <ul className="list-disc list-inside space-y-2 text-foreground">
                  {Array.isArray(aiAnalysisResult.recommendations) ? 
                    aiAnalysisResult.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    )) :
                    <li>{aiAnalysisResult.recommendations}</li>
                  }
                </ul>
              </div>

              {/* Risico Inschatting */}
              {aiAnalysisResult.riskAssessment && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2 text-foreground">Risico Inschatting</h3>
                  <p className="text-foreground whitespace-pre-wrap">{aiAnalysisResult.riskAssessment}</p>
                </div>
              )}

              {/* Voorkomende Maatregelen */}
              {aiAnalysisResult.preventiveMeasures && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">Voorkomende Maatregelen</h3>
                  <ul className="list-disc list-inside space-y-2 text-foreground">
                    {Array.isArray(aiAnalysisResult.preventiveMeasures) ?
                      aiAnalysisResult.preventiveMeasures.map((measure: string, idx: number) => (
                        <li key={idx}>{measure}</li>
                      )) :
                      <li>{aiAnalysisResult.preventiveMeasures}</li>
                    }
                  </ul>
                </div>
              )}

              {/* Voorgestelde Toolbox Onderwerpen */}
              {aiAnalysisResult.suggestedToolboxTopics && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-foreground">Voorgestelde Toolbox Onderwerpen</h3>
                  <div className="space-y-4">
                    {Array.isArray(aiAnalysisResult.suggestedToolboxTopics) &&
                      aiAnalysisResult.suggestedToolboxTopics.map((topic: any, idx: number) => (
                        <div key={idx} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">{topic.topic}</h4>
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium mt-1 ${
                                topic.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                                topic.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                                Prioriteit: {topic.priority === 'high' ? 'Hoog' : topic.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCreateToolbox(topic)}
                              disabled={isCreatingToolbox}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {isCreatingToolbox ? 'Aanmaken...' : 'Maak Toolbox'}
                            </button>
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{topic.description}</p>
                          {topic.suggestedItems && Array.isArray(topic.suggestedItems) && topic.suggestedItems.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Voorgestelde items:</p>
                              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                {topic.suggestedItems.slice(0, 5).map((item: string, itemIdx: number) => (
                                  <li key={itemIdx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AISafetyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Veiligheidsmeldingen laden...</p>
          </div>
        </div>
      </div>
    }>
      <AISafetyPageContent />
    </Suspense>
  );
}
