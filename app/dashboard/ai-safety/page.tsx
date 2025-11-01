"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SafetyIncident {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  priority: string;
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
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  projectId: string;
  name: string;
}

export default function AISafetyPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    incidentId: "",
    title: "",
    description: "",
    category: "graafschade",
    severity: "medium",
    priority: "medium",
    infrastructureType: "riool",
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

  useEffect(() => {
    fetchIncidents();
    fetchProjects();
  }, []);

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
        // Reset form
        setFormData({
          incidentId: "",
          title: "",
          description: "",
          category: "graafschade",
          severity: "medium",
          priority: "medium",
          infrastructureType: "riool",
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

  const getInfrastructureLabel = (type: string) => {
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
            <div className="flex gap-3">
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

                  {/* Type Infrastructuur */}
                  <div>
                    <label htmlFor="infrastructureType" className="block text-sm font-medium mb-2 text-foreground">
                      Type Infrastructuur
                    </label>
                    <select
                      id="infrastructureType"
                      name="infrastructureType"
                      value={formData.infrastructureType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    >
                      <option value="riool">Riool</option>
                      <option value="water">Waterleidingen</option>
                      <option value="gas">Gasleidingen</option>
                      <option value="elektra">Elektriciteit</option>
                      <option value="telecom">Telecom/Kabel</option>
                      <option value="warmte">Warmtenet</option>
                      <option value="metro">Metro/Spoor</option>
                      <option value="tunnel">Tunnel</option>
                      <option value="parkeergarage">Ondergrondse Parkeergarage</option>
                      <option value="overig">Overig</option>
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

          {/* Incidents Table */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Veiligheidsmeldingen</h2>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Laden...
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
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Incident ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Titel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Categorie
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Ernst
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Gemeld op
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {incidents.map((incident) => (
                        <tr
                          key={incident.id}
                          onClick={() => router.push(`/dashboard/ai-safety/${incident.id}`)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {incident.incidentId}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">
                              {incident.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {incident.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {getCategoryLabel(incident.category)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}
                            >
                              {getSeverityLabel(incident.severity)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getStatusColor(incident.status)}`}
                            >
                              {getStatusLabel(incident.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {incident.projectId ? (
                                <span className="text-primary">Project #{incident.projectId}</span>
                              ) : (
                                <span className="text-muted-foreground">Algemeen</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

