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

export default function ProjectsPlanningPage() {
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
  const [timeframeStart, setTimeframeStart] = useState("");
  const [timeframeEnd, setTimeframeEnd] = useState("");

  // Timeline states
  const [timelineStart, setTimelineStart] = useState<Date>(new Date());
  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date());

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Bereken timeline range op basis van alle projecten
        if (data.length > 0) {
          const dates = data
            .map((p: Project) => [p.startDate, p.plannedEndDate, p.endDate])
            .flat()
            .filter((d: string | null): d is string => d !== null)
            .map((d: string) => new Date(d));
          
          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
            
            minDate.setMonth(minDate.getMonth() - 1);
            maxDate.setMonth(maxDate.getMonth() + 1);
            
            setTimelineStart(minDate);
            setTimelineEnd(maxDate);
          }
        }
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

      // Timeframe filter
      if (timeframeStart || timeframeEnd) {
        const projectStart = project.startDate ? new Date(project.startDate) : null;
        const projectEnd = project.plannedEndDate
          ? new Date(project.plannedEndDate)
          : project.endDate
          ? new Date(project.endDate)
          : null;

        if (timeframeStart && projectEnd && new Date(timeframeStart) > projectEnd) {
          return false;
        }
        if (timeframeEnd && projectStart && new Date(timeframeEnd) < projectStart) {
          return false;
        }
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
    timeframeStart,
    timeframeEnd,
  ]);

  // Update timeline range op basis van gefilterde projecten
  useEffect(() => {
    const projectsToUse = filteredProjects.length > 0 ? filteredProjects : projects;
    
    if (projectsToUse.length > 0) {
      let dates: Date[] = [];
      
      if (timeframeStart || timeframeEnd) {
        if (timeframeStart) dates.push(new Date(timeframeStart));
        if (timeframeEnd) dates.push(new Date(timeframeEnd));
        projectsToUse.forEach(p => {
          if (p.startDate) dates.push(new Date(p.startDate));
          if (p.plannedEndDate) dates.push(new Date(p.plannedEndDate));
          if (p.endDate) dates.push(new Date(p.endDate));
        });
      } else {
        dates = projectsToUse
          .map(p => [p.startDate, p.plannedEndDate, p.endDate])
          .flat()
          .filter((d: string | null): d is string => d !== null)
          .map(d => new Date(d));
      }
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        
        minDate.setMonth(minDate.getMonth() - 1);
        maxDate.setMonth(maxDate.getMonth() + 1);
        
        setTimelineStart(minDate);
        setTimelineEnd(maxDate);
      }
    }
  }, [filteredProjects, projects, timeframeStart, timeframeEnd]);

  // Generate timeline months
  const timelineMonths = useMemo(() => {
    const months: Date[] = [];
    const current = new Date(timelineStart);
    while (current <= timelineEnd) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }, [timelineStart, timelineEnd]);

  // Timeline calculations
  const getProjectPosition = (project: Project) => {
    const start = project.startDate ? new Date(project.startDate) : timelineStart;
    const end = project.plannedEndDate
      ? new Date(project.plannedEndDate)
      : project.endDate
      ? new Date(project.endDate)
      : timelineEnd;

    const totalDays = Math.ceil(
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const projectStartDays = Math.ceil(
      (start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const projectDuration = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const left = Math.max(0, (projectStartDays / totalDays) * 100);
    const width = Math.min(100 - left, (projectDuration / totalDays) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
    disciplineFilter !== "all" ||
    timeframeStart ||
    timeframeEnd;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setOrganizationFilter("all");
    setManagerFilter("all");
    setPlaatsFilter("all");
    setCategoryFilter("all");
    setDisciplineFilter("all");
    setTimeframeStart("");
    setTimeframeEnd("");
  };

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
                  Projectplanning Overzicht
                </h1>
                <p className="text-muted-foreground">
                  Visuele weergave van alle projecten met begin- en einddata
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
                      timeframeStart && "tijd",
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

                {/* Tijdsframe */}
                <div>
                  <Label htmlFor="timeframeStart">Tijdsframe vanaf</Label>
                  <Input
                    id="timeframeStart"
                    type="date"
                    value={timeframeStart}
                    onChange={(e) => setTimeframeStart(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="timeframeEnd">Tijdsframe tot</Label>
                  <Input
                    id="timeframeEnd"
                    type="date"
                    value={timeframeEnd}
                    onChange={(e) => setTimeframeEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredProjects.length} van {projects.length} projecten
          </div>

          {/* Timeline View */}
          {filteredProjects.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">Geen projecten gevonden</p>
              <p className="text-sm text-muted-foreground">
                Pas de filters aan om meer resultaten te zien
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="flex">
                {/* Fixed columns - links */}
                <div className="flex-shrink-0 border-r border-border">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-48">
                          Project
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-32">
                          Status
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-32">
                          Manager
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-28">
                          Startdatum
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-28">
                          Einddatum
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground w-32">
                          Locatie
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr
                          key={project.id}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        >
                          <td className="p-3">
                            <div className="font-medium text-sm text-foreground truncate">
                              {project.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {project.projectId}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`${getStatusColor(project.status)} text-xs`}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-foreground">
                            {project.projectManager || "-"}
                          </td>
                          <td className="p-3 text-sm text-foreground">
                            {formatDate(project.startDate)}
                          </td>
                          <td className="p-3 text-sm text-foreground">
                            {formatDate(project.plannedEndDate || project.endDate)}
                          </td>
                          <td className="p-3 text-sm text-foreground">
                            {project.plaats || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Scrollable planning column - rechts */}
                <div className="flex-1 overflow-x-auto">
                  <div style={{ minWidth: `${timelineMonths.length * 120}px` }}>
                    {/* Planning header */}
                    <div className="bg-muted/30 border-b border-border p-3 sticky top-0 z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Planning</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newStart = new Date(timelineStart);
                              newStart.setMonth(newStart.getMonth() - 1);
                              setTimelineStart(newStart);
                            }}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newEnd = new Date(timelineEnd);
                              newEnd.setMonth(newEnd.getMonth() + 1);
                              setTimelineEnd(newEnd);
                            }}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Month labels */}
                      <div className="relative h-5">
                        {timelineMonths.map((month, index) => (
                          <div
                            key={index}
                            className="absolute text-[10px] text-muted-foreground border-l border-border pl-1"
                            style={{
                              left: `${(index / timelineMonths.length) * 100}%`,
                              width: `${(1 / timelineMonths.length) * 100}%`,
                            }}
                          >
                            {month.toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Planning bars */}
                    <div>
                      {filteredProjects.map((project) => {
                        const position = getProjectPosition(project);
                        const hasDates = project.startDate || project.plannedEndDate || project.endDate;

                        return (
                          <div
                            key={project.id}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            style={{ height: "60px" }}
                          >
                            {hasDates ? (
                              <div className="relative h-full flex items-center p-3">
                                <div
                                  className="relative h-6 bg-muted/30 rounded overflow-hidden"
                                  style={{ width: "100%" }}
                                >
                                  <div
                                    className={`absolute h-full ${getStatusColor(project.status)} opacity-80 rounded transition-all hover:opacity-100 flex items-center text-[10px] text-white font-medium px-2 whitespace-nowrap`}
                                    style={{
                                      left: position.left,
                                      width: position.width,
                                      minWidth: "80px",
                                    }}
                                    title={`${formatDate(project.startDate)} - ${formatDate(project.plannedEndDate || project.endDate)}`}
                                  >
                                    {parseFloat(position.width) > 12 && (
                                      <span className="truncate">{project.name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center p-3">
                                <span className="text-xs text-muted-foreground">Geen datums</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
