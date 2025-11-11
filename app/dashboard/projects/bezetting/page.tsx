"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Project {
  id: number;
  projectId: string;
  name: string;
  status: string;
  projectManager: string | null;
  plaats: string | null;
  startDate: string | null;
  plannedEndDate: string | null;
  endDate: string | null;
  organization: string | null;
  category: string | null;
  discipline: string | null;
}

interface WeekOccupancy {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  occupancy: number;
  activeProjects?: Project[];
}

export default function BezettingOverzichtPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [plaatsFilter, setPlaatsFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");

  // Date range for view
  const [viewStartDate, setViewStartDate] = useState<Date>(new Date());
  const [viewEndDate, setViewEndDate] = useState<Date>(new Date());

  // Modal state voor projecten in week
  const [selectedWeek, setSelectedWeek] = useState<WeekOccupancy | null>(null);
  const [showWeekProjects, setShowWeekProjects] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const result = await response.json();
        // Nieuwe API structuur: { data, pagination }
        const data = result.data || result;
        setProjects(data);
        
        // Bereken standaard view range (huidige jaar)
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        
        setViewStartDate(yearStart);
        setViewEndDate(yearEnd);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logica
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          project.name?.toLowerCase().includes(query) ||
          project.projectId?.toLowerCase().includes(query) ||
          project.plaats?.toLowerCase().includes(query) ||
          project.projectManager?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      // Organization filter
      if (organizationFilter !== "all") {
        if (organizationFilter === "none" && project.organization !== null) {
          return false;
        }
        if (organizationFilter !== "none" && project.organization !== organizationFilter) {
          return false;
        }
      }

      // Manager filter
      if (managerFilter !== "all" && project.projectManager !== managerFilter) {
        return false;
      }

      // Plaats filter
      if (plaatsFilter !== "all" && project.plaats !== plaatsFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && project.category !== categoryFilter) {
        return false;
      }

      // Discipline filter
      if (disciplineFilter !== "all" && project.discipline !== disciplineFilter) {
        return false;
      }

      return true;
    });
  }, [
    projects,
    searchQuery,
    statusFilter,
    organizationFilter,
    managerFilter,
    plaatsFilter,
    categoryFilter,
    disciplineFilter,
  ]);

  // Bereken week bezetting
  const weekOccupancy = useMemo(() => {
    const weeks: WeekOccupancy[] = [];
    const current = new Date(viewStartDate);
    
    // Start vanaf maandag van de eerste week
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Maandag
    current.setDate(diff);
    current.setHours(0, 0, 0, 0);

    while (current <= viewEndDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Bereken weeknummer
      const oneJan = new Date(weekStart.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((weekStart.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);

      // Tel actieve projecten in deze week (elk project = 1 ploeg)
      const occupancy = filteredProjects.filter((project) => {
        if (!project.startDate) return false;
        
        const projectStart = new Date(project.startDate);
        const projectEnd = project.plannedEndDate
          ? new Date(project.plannedEndDate)
          : project.endDate
          ? new Date(project.endDate)
          : null;

        if (!projectEnd) return false;

        // Project is actief als het overlapt met deze week
        return projectStart <= weekEnd && projectEnd >= weekStart;
      }).length;

      weeks.push({
        weekStart,
        weekEnd,
        weekNumber,
        year: weekStart.getFullYear(),
        occupancy,
      });

      // Ga naar volgende week
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }, [filteredProjects, viewStartDate, viewEndDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatDateFull = (date: Date) => {
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatWeekLabel = (weekStart: Date, weekEnd: Date) => {
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const handleBarClick = (week: WeekOccupancy) => {
    // Vind alle projecten die actief zijn in deze week
    const activeProjects = filteredProjects.filter((project) => {
      if (!project.startDate) return false;
      
      const projectStart = new Date(project.startDate);
      const projectEnd = project.plannedEndDate
        ? new Date(project.plannedEndDate)
        : project.endDate
        ? new Date(project.endDate)
        : null;

      if (!projectEnd) return false;

      return projectStart <= week.weekEnd && projectEnd >= week.weekStart;
    });

    setSelectedWeek({ ...week, activeProjects });
    setShowWeekProjects(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-chart-1",
      "on-hold": "bg-chart-3",
      completed: "bg-chart-2",
      cancelled: "bg-muted",
    };
    return colors[status] || "bg-muted";
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

  // Unique values for filters
  const uniqueOrganizations = useMemo(
    () => Array.from(new Set(projects.map((p) => p.organization).filter((org): org is string => org !== null))),
    [projects]
  );
  const uniqueManagers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.projectManager).filter((mgr): mgr is string => mgr !== null))),
    [projects]
  );
  const uniquePlaces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.plaats).filter((plaats): plaats is string => plaats !== null))),
    [projects]
  );
  const uniqueCategories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category).filter((cat): cat is string => cat !== null))),
    [projects]
  );
  const uniqueDisciplines = useMemo(
    () => Array.from(new Set(projects.map((p) => p.discipline).filter((disc): disc is string => disc !== null))),
    [projects]
  );

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    organizationFilter !== "all" ||
    managerFilter !== "all" ||
    plaatsFilter !== "all" ||
    categoryFilter !== "all" ||
    disciplineFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setOrganizationFilter("all");
    setManagerFilter("all");
    setPlaatsFilter("all");
    setCategoryFilter("all");
    setDisciplineFilter("all");
  };

  const maxOccupancy = useMemo(() => {
    const max = Math.max(...weekOccupancy.map((w) => w.occupancy), 0);
    // Rond af naar boven naar een mooie ronde waarde voor nettere Y-as
    if (max === 0) return 1;
    // Rond af naar boven naar het volgende mooie getal (bijv. 14 -> 15, 11 -> 12)
    return Math.ceil(max / 5) * 5; // Rond af naar boven naar veelvoud van 5
  }, [weekOccupancy]);

  const avgOccupancy = useMemo(() => {
    if (weekOccupancy.length === 0) return 0;
    return weekOccupancy.reduce((sum, w) => sum + w.occupancy, 0) / weekOccupancy.length;
  }, [weekOccupancy]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar projecten
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Bezettingsoverzicht
                </h1>
                <p className="text-muted-foreground">
                  Aantal ploegen per week (1 project = 1 ploeg)
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {[
                      searchQuery && "zoek",
                      statusFilter !== "all" && "status",
                      organizationFilter !== "all" && "org",
                      managerFilter !== "all" && "manager",
                      plaatsFilter !== "all" && "plaats",
                      categoryFilter !== "all" && "categorie",
                      disciplineFilter !== "all" && "discipline",
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">Filters</h2>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Reset alle filters
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Search */}
                <div className="lg:col-span-3">
                  <Label htmlFor="search">Zoeken</Label>
                  <Input
                    id="search"
                    placeholder="Zoek op project ID, naam, plaats, manager..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle statussen</SelectItem>
                      <SelectItem value="active">Actief</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Afgerond</SelectItem>
                      <SelectItem value="cancelled">Geannuleerd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Organisatie */}
                <div>
                  <Label htmlFor="organization">Organisatie</Label>
                  <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                    <SelectTrigger id="organization">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle organisaties</SelectItem>
                      <SelectItem value="none">Geen organisatie</SelectItem>
                      {uniqueOrganizations.map((org) => (
                        <SelectItem key={org} value={org}>
                          {org}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manager */}
                <div>
                  <Label htmlFor="manager">Projectmanager</Label>
                  <Select value={managerFilter} onValueChange={setManagerFilter}>
                    <SelectTrigger id="manager">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle managers</SelectItem>
                      {uniqueManagers.map((manager) => (
                        <SelectItem key={manager} value={manager}>
                          {manager}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plaats */}
                <div>
                  <Label htmlFor="plaats">Plaats</Label>
                  <Select value={plaatsFilter} onValueChange={setPlaatsFilter}>
                    <SelectTrigger id="plaats">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle plaatsen</SelectItem>
                      {uniquePlaces.map((plaats) => (
                        <SelectItem key={plaats} value={plaats}>
                          {plaats}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Categorie</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle categorieën</SelectItem>
                      {uniqueCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Discipline */}
                <div>
                  <Label htmlFor="discipline">Discipline</Label>
                  <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                    <SelectTrigger id="discipline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle disciplines</SelectItem>
                      {uniqueDisciplines.map((disc) => (
                        <SelectItem key={disc} value={disc}>
                          {disc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Selector */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="viewStart">Vanaf datum</Label>
                <Input
                  id="viewStart"
                  type="date"
                  value={viewStartDate.toISOString().split("T")[0]}
                  onChange={(e) => setViewStartDate(new Date(e.target.value))}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="viewEnd">Tot datum</Label>
                <Input
                  id="viewEnd"
                  type="date"
                  value={viewEndDate.toISOString().split("T")[0]}
                  onChange={(e) => setViewEndDate(new Date(e.target.value))}
                />
              </div>
              <div className="flex gap-2 items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    const yearEnd = new Date(now.getFullYear(), 11, 31);
                    setViewStartDate(yearStart);
                    setViewEndDate(yearEnd);
                  }}
                >
                  Huidig jaar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setViewStartDate(monthStart);
                    setViewEndDate(monthEnd);
                  }}
                >
                  Huidige maand
                </Button>
              </div>
            </div>
          </div>

          {/* Statistieken */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{maxOccupancy}</div>
              <div className="text-sm text-muted-foreground mt-1">Maximaal aantal ploegen</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">
                {avgOccupancy > 0 ? Math.round(avgOccupancy * 10) / 10 : 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Gemiddeld aantal ploegen</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{weekOccupancy.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Aantal weken</div>
            </div>
          </div>

          {/* Grafiek */}
          {weekOccupancy.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">Geen data beschikbaar</p>
              <p className="text-sm text-muted-foreground">
                Pas de datum range aan om resultaten te zien
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Grafiek container */}
                <div className="relative">
                  {/* Y-as labels - gelijkmatig verdeeld van 0 tot maxOccupancy */}
                  <div className="absolute left-0 w-12 pr-2 border-r border-border" style={{ height: "320px", bottom: "80px" }}>
                    <div className="h-full flex flex-col justify-between py-1">
                      {(() => {
                        const maxValue = Math.max(maxOccupancy, 1);
                        const numSteps = 6; // 0 tot maxValue in 6 gelijke stappen
                        const step = maxValue / (numSteps - 1);
                        const labels: number[] = [];
                        
                        // Genereer labels van maxValue naar 0 met gelijke stappen
                        // Labels worden gelijkmatig verdeeld over de hoogte
                        for (let i = 0; i < numSteps; i++) {
                          const value = maxValue - (i * step);
                          labels.push(Math.round(value * 10) / 10); // Rond af op 1 decimaal
                        }
                        
                        // Zorg dat 0 altijd onderaan staat
                        labels[labels.length - 1] = 0;
                        
                        return labels.map((value, i) => (
                          <div key={i} className={`text-xs text-muted-foreground text-right leading-tight ${value === 0 ? 'font-semibold text-foreground' : ''}`}>
                            {Math.round(value)}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Grafiek gebied */}
                  <div className="ml-14 mr-4">
                    <div className="relative" style={{ height: "400px" }}>
                      {/* Grafiek hoogte - exact dezelfde hoogte voor Y-as en balken */}
                      <div className="absolute inset-0" style={{ height: "320px", bottom: "80px" }}>
                        {/* Grid lijnen - gelijkmatig verdeeld van 0 tot maxOccupancy */}
                        <div className="absolute inset-0">
                          {(() => {
                            const maxValue = Math.max(maxOccupancy, 1);
                            const numSteps = 6;
                            
                            // Genereer lijnen met gelijke stappen - gelijkmatig verdeeld over de hoogte
                            return Array.from({ length: numSteps }, (_, i) => {
                              // Y positie: gelijkmatig verdeeld, 0 = 100% (onderaan), maxValue = 0% (boven)
                              const y = (i / (numSteps - 1)) * 100;
                              const isZeroLine = i === numSteps - 1;
                              return (
                                <div
                                  key={i}
                                  className={`absolute left-0 right-0 border-t ${isZeroLine ? 'border-t-2 border-border/50' : 'border-border/15'}`}
                                  style={{ top: `${y}%` }}
                                />
                              );
                            });
                          })()}
                        </div>

                        {/* Scrollable content voor balken */}
                        <div className="absolute inset-0 overflow-x-auto" style={{ paddingBottom: "0" }}>
                          <div
                            className="relative h-full"
                            style={{ 
                              minWidth: `${Math.max(weekOccupancy.length * 60, 600)}px`
                            }}
                          >
                            {/* Balken grafiek - balken beginnen op 0-lijn */}
                            <div className="absolute left-0 right-0 bottom-0 flex gap-3 px-3" style={{ height: "100%", alignItems: "flex-end" }}>
                              {weekOccupancy.map((week, index) => {
                                // Bereken hoogte: balk moet vanaf 0 groeien tot occupancy waarde
                                const maxValue = Math.max(maxOccupancy, 1);
                                // Hoogte als percentage van de totale hoogte (0 tot maxValue)
                                // Dit moet exact overeenkomen met de Y-as schaal
                                const heightPercentage = week.occupancy > 0 
                                  ? (week.occupancy / maxValue) * 100 
                                  : 0;
                                
                                return (
                                  <div
                                    key={index}
                                    className="flex-1 group relative"
                                    style={{ 
                                      minWidth: "60px", 
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      justifyContent: "flex-end"
                                    }}
                                  >
                                    {/* Balk - begint op 0-lijn, groeit naar boven */}
                                    <div
                                      onClick={() => week.occupancy > 0 && handleBarClick(week)}
                                      className={`w-full bg-chart-1 rounded-t transition-all hover:bg-chart-1/80 hover:shadow-lg relative ${
                                        week.occupancy > 0 ? "cursor-pointer border border-chart-1/30" : "cursor-default"
                                      }`}
                                      style={{ 
                                        height: `${heightPercentage}%`,
                                        minHeight: week.occupancy > 0 ? "4px" : "0px"
                                      }}
                                      title={week.occupancy > 0 ? `Week ${week.weekNumber} (${week.year})\n${formatWeekLabel(week.weekStart, week.weekEnd)}\n${week.occupancy} ploeg${week.occupancy !== 1 ? "en" : ""}\nKlik voor details` : ""}
                                    >
                                      {/* Alleen waarde boven balk, GEEN weeknummer */}
                                      {week.occupancy > 0 && (
                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-foreground whitespace-nowrap bg-background/90 px-2 py-0.5 rounded shadow-sm border border-border/50">
                                          {week.occupancy}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* X-as labels - weeknummers en datums ONDER de X-as */}
                      <div className="absolute bottom-0 left-0 right-0 h-20 flex items-start ml-14 mr-4">
                        <div className="overflow-x-auto w-full">
                          <div className="flex gap-3 px-3" style={{ minWidth: `${Math.max(weekOccupancy.length * 63, 600)}px` }}>
                            {weekOccupancy.map((week, index) => (
                              <div
                                key={index}
                                className="flex-1 min-w-[60px] text-center"
                              >
                                <div className="text-sm font-semibold text-foreground mb-1.5">
                                  W{week.weekNumber}
                                </div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                  {formatDate(week.weekStart)}
                                </div>
                                <div className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                                  {formatDate(week.weekEnd)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* X-as label */}
                    <div className="text-center mt-2 text-sm text-muted-foreground">
                      Tijd (weken)
                    </div>
                  </div>

                  {/* Y-as label */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-muted-foreground whitespace-nowrap">
                    Aantal ploegen
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dialog voor projecten in week */}
          <Dialog open={showWeekProjects} onOpenChange={setShowWeekProjects}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Projecten in week {selectedWeek?.weekNumber} ({selectedWeek?.year})
                </DialogTitle>
                <DialogDescription>
                  {selectedWeek && `${formatDateFull(selectedWeek.weekStart)} - ${formatDateFull(selectedWeek.weekEnd)} • ${selectedWeek.occupancy} ploeg${selectedWeek.occupancy !== 1 ? "en" : ""}`}
                </DialogDescription>
              </DialogHeader>
              
              {selectedWeek && (
                <div className="mt-4">
                  {selectedWeek.activeProjects && selectedWeek.activeProjects.length > 0 ? (
                    <div className="space-y-2">
                      {selectedWeek.activeProjects.map((project) => (
                        <div
                          key={project.id}
                          className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => {
                            setShowWeekProjects(false);
                            router.push(`/dashboard/projects/${project.id}`);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{project.name}</h3>
                                <Badge variant="outline" className={`${getStatusColor(project.status)} text-xs`}>
                                  {getStatusLabel(project.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{project.projectId}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                {project.projectManager && (
                                  <div>
                                    <span className="font-medium">Manager:</span> {project.projectManager}
                                  </div>
                                )}
                                {project.plaats && (
                                  <div>
                                    <span className="font-medium">Locatie:</span> {project.plaats}
                                  </div>
                                )}
                                {project.startDate && (
                                  <div>
                                    <span className="font-medium">Start:</span> {formatDateFull(new Date(project.startDate))}
                                  </div>
                                )}
                                {(project.plannedEndDate || project.endDate) && (
                                  <div>
                                    <span className="font-medium">Eind:</span> {formatDateFull(new Date(project.plannedEndDate || project.endDate!))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Geen projecten in deze week
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

