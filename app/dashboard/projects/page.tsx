"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Search, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Project {
  id: number;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  plaats: string | null;
  gemeente: string | null;
  projectManager: string | null;
  organization: string | null;
  startDate: string | null;
  plannedEndDate: string | null;
  budget: number | null;
  createdAt: string;
  safetyIncidentCount: number;
  inspectionCount: number;
  supervisionCount: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plaatsFilter, setPlaatsFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    projectId: "",
    name: "",
    description: "",
    projectManager: "",
    startDate: "",
    endDate: "",
    budget: "",
    status: "active",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          projectId: "",
          name: "",
          description: "",
          projectManager: "",
          startDate: "",
          endDate: "",
          budget: "",
          status: "active",
        });
        setShowForm(false);
        fetchProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL");
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

  // Filtering logic
  const filteredProjects = projects.filter((project) => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        project.projectId.toLowerCase().includes(query) ||
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.projectManager && project.projectManager.toLowerCase().includes(query)) ||
        (project.plaats && project.plaats.toLowerCase().includes(query)) ||
        (project.gemeente && project.gemeente.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && project.status !== statusFilter) {
      return false;
    }

    // Plaats filter
    if (plaatsFilter !== "all" && project.plaats !== plaatsFilter) {
      return false;
    }

    // Manager filter
    if (managerFilter !== "all" && project.projectManager !== managerFilter) {
      return false;
    }

    return true;
  });

  // Get unique places for filter
  const uniquePlaces = Array.from(
    new Set(
      projects
        .map(p => p.plaats)
        .filter((plaats): plaats is string => plaats !== null && plaats !== undefined)
    )
  ).sort();

  // Get unique managers for filter
  const uniqueManagers = Array.from(
    new Set(
      projects
        .map(p => p.projectManager)
        .filter((manager): manager is string => manager !== null && manager !== undefined)
    )
  ).sort();

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPlaatsFilter("all");
    setManagerFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || plaatsFilter !== "all" || managerFilter !== "all";

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">Projecten</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Beheer en maak nieuwe projecten aan
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm shrink-0 w-full sm:w-auto"
            >
              {showForm ? "Annuleren" : "+ Nieuw Project"}
            </button>
          </div>

          {/* Create Project Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6 text-card-foreground">
                Nieuw Project Aanmaken
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Project ID */}
                  <div>
                    <label htmlFor="projectId" className="block text-sm font-medium mb-2 text-foreground">
                      Project ID *
                    </label>
                    <input
                      type="text"
                      id="projectId"
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      required
                      placeholder="PROJ-2024-001"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Project Naam */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
                      Projectnaam *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Website Redesign"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Projectmanager */}
                  <div>
                    <label htmlFor="projectManager" className="block text-sm font-medium mb-2 text-foreground">
                      Projectmanager
                    </label>
                    <input
                      type="text"
                      id="projectManager"
                      name="projectManager"
                      value={formData.projectManager}
                      onChange={handleChange}
                      placeholder="Jan Jansen"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Start Datum */}
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium mb-2 text-foreground">
                      Startdatum
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Eind Datum */}
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium mb-2 text-foreground">
                      Geplande einddatum
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Budget */}
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium mb-2 text-foreground">
                      Budget (EUR)
                    </label>
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder="50000"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-2 text-foreground">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="active">Actief</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Afgerond</option>
                      <option value="cancelled">Geannuleerd</option>
                    </select>
                  </div>
                </div>

                {/* Omschrijving */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2 text-foreground">
                    Omschrijving
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Beschrijf het project..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isCreating ? "Aanmaken..." : "Project Aanmaken"}
                </button>
              </form>
            </div>
          )}

          {/* Projects Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Mijn Projecten</h2>
              {!isLoading && projects.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {filteredProjects.length} van {projects.length} projecten
                </div>
              )}
            </div>

            {/* Search and Filters */}
            {!isLoading && projects.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Zoek op project ID, naam, plaats, gemeente, manager..."
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
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="all">Alle statussen</option>
                    <option value="active">Actief</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Afgerond</option>
                    <option value="cancelled">Geannuleerd</option>
                  </select>

                  {/* Plaats Filter */}
                  <select
                    value={plaatsFilter}
                    onChange={(e) => setPlaatsFilter(e.target.value)}
                    className="px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="all">Alle plaatsen</option>
                    {uniquePlaces.map((plaats) => (
                      <option key={plaats} value={plaats}>
                        {plaats}
                      </option>
                    ))}
                  </select>

                  {/* Manager Filter */}
                  <select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                    className="px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="all">Alle managers</option>
                    {uniqueManagers.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager}
                      </option>
                    ))}
                  </select>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors whitespace-nowrap"
                    >
                      ✕ Reset filters
                    </button>
                  )}
                </div>

                {/* Active filters info */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        Zoeken: "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery("")}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {statusFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        Status: {getStatusLabel(statusFilter)}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {plaatsFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        Plaats: {plaatsFilter}
                        <button
                          onClick={() => setPlaatsFilter("all")}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {managerFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        Manager: {managerFilter}
                        <button
                          onClick={() => setManagerFilter("all")}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Laden...
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Nog geen projecten aangemaakt</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Maak je eerste project aan →
                </button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Geen projecten gevonden met de huidige filters</p>
                <button
                  onClick={clearFilters}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  ✕ Reset alle filters
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
                      <table className="w-full min-w-[1100px]">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Project
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Locatie
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Manager
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Planning
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Budget
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              <ShieldAlert className="h-4 w-4 mx-auto" />
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              <Search className="h-4 w-4 mx-auto" />
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              <Eye className="h-4 w-4 mx-auto" />
                            </th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProjects.map((project) => (
                          <tr 
                            key={project.id}
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            {/* Project ID + Naam */}
                            <td className="px-3 py-3">
                              <div className="text-xs text-muted-foreground mb-0.5">
                                {project.projectId}
                              </div>
                              <div className="text-sm font-medium text-foreground">
                                {project.name}
                              </div>
                            </td>
                            
                            {/* Locatie */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-foreground">
                                {project.plaats || "-"}
                              </div>
                              {project.gemeente && (
                                <div className="text-xs text-muted-foreground">
                                  {project.gemeente}
                                </div>
                              )}
                            </td>
                            
                            {/* Manager */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-foreground">
                                {project.projectManager || "-"}
                              </div>
                              {project.organization && (
                                <div className="text-xs text-muted-foreground">
                                  {project.organization}
                                </div>
                              )}
                            </td>
                            
                            {/* Planning */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-foreground">
                                {formatDate(project.startDate)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                → {formatDate(project.plannedEndDate)}
                              </div>
                            </td>
                            
                            {/* Budget */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-foreground font-medium">
                                {formatBudget(project.budget)}
                              </div>
                            </td>
                            
                            {/* Status */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(project.status)}`}
                              >
                                {getStatusLabel(project.status)}
                              </span>
                            </td>
                            
                            {/* Meldingen */}
                            <td 
                              className="px-3 py-3 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/ai-safety?projectId=${project.id}`);
                              }}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center cursor-pointer">
                                      <span 
                                        className={`text-sm font-semibold ${
                                          project.safetyIncidentCount > 0 
                                            ? "text-destructive" 
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {project.safetyIncidentCount}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Veiligheidsmeldingen</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            
                            {/* Schouwen */}
                            <td 
                              className="px-3 py-3 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/ai-schouw?projectId=${project.id}`);
                              }}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center cursor-pointer">
                                      <span 
                                        className={`text-sm font-semibold ${
                                          project.inspectionCount > 0 
                                            ? "text-primary" 
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {project.inspectionCount}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>AI Schouwen</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            
                            {/* Toezicht */}
                            <td 
                              className="px-3 py-3 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/ai-toezicht?projectId=${project.id}`);
                              }}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center cursor-pointer">
                                      <span 
                                        className={`text-sm font-semibold ${
                                          project.supervisionCount > 0 
                                            ? "text-primary" 
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {project.supervisionCount}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>AI Toezicht</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">
                            {project.projectId}
                          </div>
                          <h3 className="text-base font-semibold text-foreground">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(project.status)} ml-2 shrink-0`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Locatie */}
                        {(project.plaats || project.gemeente) && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Locatie</div>
                            <div className="text-foreground font-medium">
                              {project.plaats || "-"}
                            </div>
                            {project.gemeente && (
                              <div className="text-xs text-muted-foreground">
                                {project.gemeente}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Manager */}
                        {project.projectManager && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Manager</div>
                            <div className="text-foreground font-medium">
                              {project.projectManager}
                            </div>
                            {project.organization && (
                              <div className="text-xs text-muted-foreground">
                                {project.organization}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Startdatum */}
                        {project.startDate && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Start</div>
                            <div className="text-foreground">
                              {formatDate(project.startDate)}
                            </div>
                          </div>
                        )}

                        {/* Einddatum */}
                        {project.plannedEndDate && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Eind</div>
                            <div className="text-foreground">
                              {formatDate(project.plannedEndDate)}
                            </div>
                          </div>
                        )}

                        {/* Budget */}
                        {project.budget && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Budget</div>
                            <div className="text-foreground font-semibold">
                              {formatBudget(project.budget)}
                            </div>
                          </div>
                        )}

                        {/* Meldingen */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Veiligheidsmeldingen</div>
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/ai-safety?projectId=${project.id}`);
                            }}
                          >
                            <ShieldAlert 
                              className={`h-4 w-4 ${
                                project.safetyIncidentCount > 0 
                                  ? "text-destructive" 
                                  : "text-muted-foreground"
                              }`} 
                            />
                            <span 
                              className={`font-semibold ${
                                project.safetyIncidentCount > 0 
                                  ? "text-destructive" 
                                  : "text-muted-foreground"
                              }`}
                            >
                              {project.safetyIncidentCount}
                            </span>
                          </div>
                        </div>

                        {/* Schouwen */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">AI Schouwen</div>
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/ai-schouw?projectId=${project.id}`);
                            }}
                          >
                            <Search 
                              className={`h-4 w-4 ${
                                project.inspectionCount > 0 
                                  ? "text-primary" 
                                  : "text-muted-foreground"
                              }`} 
                            />
                            <span 
                              className={`font-semibold ${
                                project.inspectionCount > 0 
                                  ? "text-primary" 
                                  : "text-muted-foreground"
                              }`}
                            >
                              {project.inspectionCount}
                            </span>
                          </div>
                        </div>

                        {/* Toezicht */}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">AI Toezicht</div>
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/ai-toezicht?projectId=${project.id}`);
                            }}
                          >
                            <Eye 
                              className={`h-4 w-4 ${
                                project.supervisionCount > 0 
                                  ? "text-primary" 
                                  : "text-muted-foreground"
                              }`} 
                            />
                            <span 
                              className={`font-semibold ${
                                project.supervisionCount > 0 
                                  ? "text-primary" 
                                  : "text-muted-foreground"
                              }`}
                            >
                              {project.supervisionCount}
                            </span>
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
    </div>
  );
}

