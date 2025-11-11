"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, Building2, AlertTriangle, Layers, Filter, X } from "lucide-react";

// Dynamic import van Map component om SSR issues te voorkomen
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-muted-foreground">Kaart laden...</div>
    </div>
  ),
});

interface ProjectFromAPI {
  id: number;
  projectId: string;
  name: string;
  plaats: string;
  gemeente: string;
  status: string;
  coordinates?: string;
}

interface Project extends ProjectFromAPI {
  latitude: number;
  longitude: number;
}

interface IncidentFromAPI {
  id: number;
  incidentId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  location: string;
  coordinates: string;
}

interface Incident extends IncidentFromAPI {
  latitude: number;
  longitude: number;
}

export default function KaartPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Filter states - initialiseer met user preferences
  const [showProjects, setShowProjects] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(["low", "medium", "high", "critical"]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(["open", "investigating"]);
  const [mapSettings, setMapSettings] = useState<{
    defaultZoom: number;
    center: [number, number];
    showProjects: boolean;
    showIncidents: boolean;
    mapStyle: string;
  } | null>(null);

  useEffect(() => {
    loadUserPreferences();
    fetchData();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const prefs = data.preferences;
        
        if (prefs?.mapSettings) {
          try {
            const settings = JSON.parse(prefs.mapSettings);
            setMapSettings(settings);
            setShowProjects(settings.showProjects ?? true);
            setShowIncidents(settings.showIncidents ?? true);
          } catch {
            // Use defaults
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch projecten
      const projectsResponse = await fetch("/api/projects");
      if (projectsResponse.ok) {
        const result = await projectsResponse.json();
        // Nieuwe API structuur: { data, pagination }
        const projectsData: ProjectFromAPI[] = result.data || result;
        // Parse coordinates from string "lat, lng"
        const projectsWithCoords: Project[] = projectsData
          .filter((p) => p.coordinates)
          .map((p) => {
            const [lat, lng] = p.coordinates!.split(",").map((s) => parseFloat(s.trim()));
            return {
              ...p,
              latitude: lat,
              longitude: lng,
            };
          })
          .filter((p) => {
            const lat = p.latitude;
            const lng = p.longitude;
            return !isNaN(lat) && !isNaN(lng);
          }) as Project[];
        setProjects(projectsWithCoords);
      }

      // Fetch incidents
      const incidentsResponse = await fetch("/api/safety-incidents");
      if (incidentsResponse.ok) {
        const result = await incidentsResponse.json();
        // Nieuwe API structuur: { data, pagination }
        const incidentsData: IncidentFromAPI[] = result.data || result;
        // Parse coordinates from string "lat, lng"
        const incidentsWithCoords: Incident[] = incidentsData
          .filter((i) => i.coordinates)
          .map((i) => {
            const [lat, lng] = i.coordinates.split(",").map((s) => parseFloat(s.trim()));
            return {
              ...i,
              latitude: lat,
              longitude: lng,
            };
          })
          .filter((i) => {
            const lat = i.latitude;
            const lng = i.longitude;
            return !isNaN(lat) && !isNaN(lng);
          }) as Incident[];
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
    <div className="h-[calc(100vh-73px)] bg-background flex flex-col md:flex-row relative">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-20 left-3 z-50 p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition-colors"
        aria-label="Toggle filters"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-foreground" />
        ) : (
          <Filter className="h-5 w-5 text-foreground" />
        )}
      </button>

      {/* Backdrop overlay voor mobiel */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar met filters */}
      <div
        className={`
          fixed md:static
          top-0 left-0
          h-full md:h-auto
          w-full md:w-80
          max-w-sm md:max-w-none
          border-r border-border bg-card overflow-y-auto z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-foreground">Kaart Overzicht</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Projecten en incidenten op locatie
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-muted rounded transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Statistieken */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-background border border-border rounded-lg p-2 sm:p-3">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Projecten</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{projects.length}</div>
            </div>
            <div className="bg-background border border-border rounded-lg p-2 sm:p-3">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Incidenten</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{incidents.length}</div>
            </div>
          </div>

          {/* Lagen */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Lagen</h3>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showProjects}
                  onChange={(e) => setShowProjects(e.target.checked)}
                  className="w-4 h-4"
                />
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Projecten ({filteredProjects.length})
                </span>
              </label>

              <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showIncidents}
                  onChange={(e) => setShowIncidents(e.target.checked)}
                  className="w-4 h-4"
                />
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Incidenten ({filteredIncidents.length})
                </span>
              </label>
            </div>
          </div>

          {/* Ernst Filters */}
          {showIncidents && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2 sm:mb-3">Ernst Niveau</h3>
              <div className="space-y-2">
                {[
                  { value: "low", label: "Laag", color: "bg-chart-1" },
                  { value: "medium", label: "Middel", color: "bg-chart-4" },
                  { value: "high", label: "Hoog", color: "bg-orange-500" },
                  { value: "critical", label: "Kritiek", color: "bg-destructive" },
                ].map(({ value, label, color }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 sm:gap-3 p-2 bg-background border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeverity.includes(value)}
                      onChange={() => toggleSeverity(value)}
                      className="w-4 h-4"
                    />
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-xs sm:text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status Filters */}
          {showIncidents && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2 sm:mb-3">Status</h3>
              <div className="space-y-2">
                {[
                  { value: "open", label: "Open" },
                  { value: "investigating", label: "In Onderzoek" },
                  { value: "resolved", label: "Opgelost" },
                  { value: "closed", label: "Gesloten" },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 sm:gap-3 p-2 bg-background border border-border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatus.includes(value)}
                      onChange={() => toggleStatus(value)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs sm:text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Legenda */}
          <div className="border-t border-border pt-3 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">Legenda</h3>
            <div className="space-y-1.5 sm:space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
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
      <div className="flex-1 relative w-full h-full">
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
            defaultCenter={mapSettings?.center || [52.3676, 5.2]}
            defaultZoom={mapSettings?.defaultZoom || 8}
            mapStyle={mapSettings?.mapStyle || 'osm'}
          />
        )}
      </div>
    </div>
  );
}

