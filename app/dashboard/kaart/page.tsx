"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, Building2, AlertTriangle, Layers } from "lucide-react";

// Dynamic import van Map component om SSR issues te voorkomen
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-muted-foreground">Kaart laden...</div>
    </div>
  ),
});

interface Project {
  id: number;
  projectId: string;
  name: string;
  plaats: string;
  gemeente: string;
  status: string;
  coordinates?: string;
  latitude?: number;
  longitude?: number;
}

interface Incident {
  id: number;
  incidentId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  location: string;
  coordinates: string;
  latitude?: number;
  longitude?: number;
}

export default function KaartPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [showProjects, setShowProjects] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(["low", "medium", "high", "critical"]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(["open", "investigating"]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch projecten
      const projectsResponse = await fetch("/api/projects");
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        // Parse coordinates from string "lat, lng"
        const projectsWithCoords = projectsData
          .filter((p: Project) => p.coordinates)
          .map((p: Project) => {
            const [lat, lng] = p.coordinates!.split(",").map((s) => parseFloat(s.trim()));
            return {
              ...p,
              latitude: lat,
              longitude: lng,
            };
          })
          .filter((p: Project) => {
            const lat = p.latitude;
            const lng = p.longitude;
            return lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
          });
        setProjects(projectsWithCoords);
      }

      // Fetch incidents
      const incidentsResponse = await fetch("/api/safety-incidents");
      if (incidentsResponse.ok) {
        const incidentsData = await incidentsResponse.json();
        // Parse coordinates from string "lat, lng"
        const incidentsWithCoords = incidentsData
          .filter((i: Incident) => i.coordinates)
          .map((i: Incident) => {
            const [lat, lng] = i.coordinates.split(",").map((s) => parseFloat(s.trim()));
            return {
              ...i,
              latitude: lat,
              longitude: lng,
            };
          })
          .filter((i: Incident) => {
            const lat = i.latitude;
            const lng = i.longitude;
            return lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
          });
        setIncidents(incidentsWithCoords);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSeverity = (severity: string) => {
    setSelectedSeverity((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(
    (incident) =>
      showIncidents &&
      selectedSeverity.includes(incident.severity) &&
      selectedStatus.includes(incident.status)
  );

  const filteredProjects = showProjects ? projects : [];

  return (
    <div className="h-[calc(100vh-73px)] bg-background flex">
      {/* Sidebar met filters */}
      <div className="w-80 border-r border-border bg-card overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Kaart Overzicht</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Projecten en incidenten op locatie
          </p>

          {/* Statistieken */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Projecten</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{projects.length}</div>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Incidenten</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{incidents.length}</div>
            </div>
          </div>

          {/* Lagen */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-foreground" />
              <h3 className="font-semibold text-foreground">Lagen</h3>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showProjects}
                  onChange={(e) => setShowProjects(e.target.checked)}
                  className="w-4 h-4"
                />
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Projecten ({filteredProjects.length})
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showIncidents}
                  onChange={(e) => setShowIncidents(e.target.checked)}
                  className="w-4 h-4"
                />
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-foreground">
                  Incidenten ({filteredIncidents.length})
                </span>
              </label>
            </div>
          </div>

          {/* Ernst Filters */}
          {showIncidents && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Ernst Niveau</h3>
              <div className="space-y-2">
                {[
                  { value: "low", label: "Laag", color: "bg-chart-1" },
                  { value: "medium", label: "Middel", color: "bg-chart-4" },
                  { value: "high", label: "Hoog", color: "bg-orange-500" },
                  { value: "critical", label: "Kritiek", color: "bg-destructive" },
                ].map(({ value, label, color }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 p-2 bg-background border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeverity.includes(value)}
                      onChange={() => toggleSeverity(value)}
                      className="w-4 h-4"
                    />
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status Filters */}
          {showIncidents && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Status</h3>
              <div className="space-y-2">
                {[
                  { value: "open", label: "Open" },
                  { value: "investigating", label: "In Onderzoek" },
                  { value: "resolved", label: "Opgelost" },
                  { value: "closed", label: "Gesloten" },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 p-2 bg-background border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatus.includes(value)}
                      onChange={() => toggleStatus(value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Legenda */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-3 text-sm">Legenda</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Project Locatie</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Kritiek Incident</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Hoog Risico</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kaart */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-muted-foreground">Data laden...</div>
            </div>
          </div>
        ) : (
          <MapView
            projects={filteredProjects}
            incidents={filteredIncidents}
          />
        )}
      </div>
    </div>
  );
}

