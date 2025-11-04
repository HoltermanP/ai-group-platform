"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Project {
  id: number;
  projectId: string;
  name: string;
  plaats: string;
  gemeente: string;
  status: string;
  latitude: number;
  longitude: number;
}

interface Incident {
  id: number;
  incidentId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  projects: Project[];
  incidents: Incident[];
  defaultCenter?: [number, number];
  defaultZoom?: number;
  mapStyle?: string;
}

// Custom icons
const createProjectIcon = (status: string) => {
  const color = status === "active" ? "#10b981" : status === "completed" ? "#3b82f6" : "#f59e0b";
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg style="
          width: 16px;
          height: 16px;
          transform: rotate(45deg);
          fill: white;
        " viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    `,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const createIncidentIcon = (severity: string) => {
  const colorMap: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#f97316",
    critical: "#ef4444",
  };
  const color = colorMap[severity] || "#6b7280";
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg style="
          width: 14px;
          height: 14px;
          fill: white;
        " viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" stroke="white" stroke-width="2" />
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2" />
        </svg>
      </div>
    `,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to fit bounds to markers
function MapBounds({ projects, incidents }: MapViewProps) {
  const map = useMap();

  useEffect(() => {
    const bounds: L.LatLngTuple[] = [];
    
    projects.forEach((project) => {
      if (project.latitude && project.longitude) {
        bounds.push([project.latitude, project.longitude]);
      }
    });
    
    incidents.forEach((incident) => {
      if (incident.latitude && incident.longitude) {
        bounds.push([incident.latitude, incident.longitude]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [map, projects, incidents]);

  return null;
}

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
    active: "Actief",
    "on-hold": "On Hold",
    completed: "Afgerond",
    open: "Open",
    investigating: "In Onderzoek",
    resolved: "Opgelost",
    closed: "Gesloten",
  };
  return labels[status] || status;
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    graafschade: "Graafschade",
    lekkage: "Lekkage",
    verzakking: "Verzakking",
    corrosie: "Corrosie",
    obstructie: "Obstructie",
    elektrisch: "Elektrisch",
    structureel: "Structureel",
    verontreiniging: "Verontreiniging",
  };
  return labels[category] || category;
};

export default function MapView({ projects, incidents, defaultCenter, defaultZoom, mapStyle = 'osm' }: MapViewProps) {
  // Centrum van Nederland als fallback
  const center: L.LatLngTuple = defaultCenter || [52.3676, 5.2];
  const zoom = defaultZoom || 8;

  // Bepaal de juiste tile layer URL op basis van mapStyle
  const getTileLayerUrl = () => {
    if (mapStyle === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    // Default: OpenStreetMap
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const getTileLayerAttribution = () => {
    if (mapStyle === 'satellite') {
      return '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution={getTileLayerAttribution()}
        url={getTileLayerUrl()}
      />
      
      <MapBounds projects={projects} incidents={incidents} />

      {/* Project Markers */}
      {projects.map((project) => (
        <Marker
          key={`project-${project.id}`}
          position={[project.latitude, project.longitude]}
          icon={createProjectIcon(project.status)}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="font-semibold text-base mb-1 text-foreground">
                {project.projectId}
              </div>
              <div className="text-sm font-medium mb-2">{project.name}</div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>📍 {project.plaats}</div>
                <div>🏛️ {project.gemeente}</div>
                <div>
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {getStatusLabel(project.status)}
                  </span>
                </div>
              </div>
              <a
                href={`/dashboard/projects/${project.id}`}
                className="inline-block mt-2 text-xs text-primary hover:underline"
              >
                Details bekijken →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Incident Markers */}
      {incidents.map((incident) => (
        <Marker
          key={`incident-${incident.id}`}
          position={[incident.latitude, incident.longitude]}
          icon={createIncidentIcon(incident.severity)}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    incident.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : incident.severity === "high"
                      ? "bg-orange-500/10 text-orange-500"
                      : incident.severity === "medium"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-green-500/10 text-green-600"
                  }`}
                >
                  {getSeverityLabel(incident.severity)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {incident.incidentId}
                </span>
              </div>
              <div className="text-sm font-medium mb-2">{incident.title}</div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>📍 {incident.location}</div>
                <div>🏷️ {getCategoryLabel(incident.category)}</div>
                <div>
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {getStatusLabel(incident.status)}
                  </span>
                </div>
              </div>
              <a
                href={`/dashboard/ai-safety/${incident.id}`}
                className="inline-block mt-2 text-xs text-primary hover:underline"
              >
                Details bekijken →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

