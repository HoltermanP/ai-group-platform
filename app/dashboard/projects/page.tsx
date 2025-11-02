"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

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
}

export default function ProjectsPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Mijn Projecten</h2>
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
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-border">
                        {projects.map((project) => (
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
                              <div className="flex items-center justify-center">
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
                  {projects.map((project) => (
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

