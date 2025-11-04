"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ActionWithIncident {
  id: number;
  actionId: string;
  incidentId: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  actionHolder: string | null;
  actionHolderEmail: string | null;
  deadline: string | null;
  aiSuggested: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  incident: {
    id: number;
    incidentId: string;
    title: string;
    status: string;
    severity: string;
    category: string;
    location: string | null;
    projectId: number | null;
    resolvedDate: string | null;
  };
}

export default function ActionsOverviewPage() {
  const router = useRouter();
  const [actions, setActions] = useState<ActionWithIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    incidentStatus: '', // open, investigating, resolved, closed
    actionStatus: '', // suggested, approved, in_progress, completed, cancelled
    actionPriority: '', // low, medium, high, urgent
    includeResolved: false, // Include resolved incidents
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchActions();
  }, [filters]);

  const fetchActions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.incidentStatus) params.append('incidentStatus', filters.incidentStatus);
      if (filters.actionStatus) params.append('actionStatus', filters.actionStatus);
      if (filters.actionPriority) params.append('actionPriority', filters.actionPriority);
      if (filters.includeResolved) params.append('includeResolved', 'true');

      const response = await fetch(`/api/safety-incidents/actions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setActions(data);
      } else {
        console.error("Fout bij ophalen acties");
      }
    } catch (error) {
      console.error("Error fetching actions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Laag",
      medium: "Middel",
      high: "Hoog",
      urgent: "Urgent",
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      suggested: "Voorgesteld",
      approved: "Goedgekeurd",
      in_progress: "In Uitvoering",
      completed: "Voltooid",
      cancelled: "Geannuleerd",
    };
    return labels[status] || status;
  };

  const getIncidentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open",
      investigating: "In Onderzoek",
      resolved: "Opgelost",
      closed: "Gesloten",
    };
    return labels[status] || status;
  };

  // Filter acties op basis van zoekquery
  const filteredActions = actions.filter(action => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      action.title.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.actionId.toLowerCase().includes(query) ||
      action.incident.title.toLowerCase().includes(query) ||
      action.incident.incidentId.toLowerCase().includes(query) ||
      (action.actionHolder && action.actionHolder.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/ai-safety"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar Veiligheidsmeldingen
            </Link>
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Acties Overzicht</h1>
                <p className="text-muted-foreground">
                  Alle acties van veiligheidsincidenten in één overzicht
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter acties op basis van verschillende criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <Label htmlFor="search">Zoeken</Label>
                    <Input
                      id="search"
                      placeholder="Zoek in acties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="incident-status">Incident Status</Label>
                    <Select
                      value={filters.incidentStatus || undefined}
                      onValueChange={(value) => setFilters({ ...filters, incidentStatus: value || '' })}
                    >
                      <SelectTrigger id="incident-status">
                        <SelectValue placeholder="Alle statussen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">In Onderzoek</SelectItem>
                        <SelectItem value="resolved">Opgelost</SelectItem>
                        <SelectItem value="closed">Gesloten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="action-status">Actie Status</Label>
                    <Select
                      value={filters.actionStatus || undefined}
                      onValueChange={(value) => setFilters({ ...filters, actionStatus: value || '' })}
                    >
                      <SelectTrigger id="action-status">
                        <SelectValue placeholder="Alle statussen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suggested">Voorgesteld</SelectItem>
                        <SelectItem value="approved">Goedgekeurd</SelectItem>
                        <SelectItem value="in_progress">In Uitvoering</SelectItem>
                        <SelectItem value="completed">Voltooid</SelectItem>
                        <SelectItem value="cancelled">Geannuleerd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="action-priority">Prioriteit</Label>
                    <Select
                      value={filters.actionPriority || undefined}
                      onValueChange={(value) => setFilters({ ...filters, actionPriority: value || '' })}
                    >
                      <SelectTrigger id="action-priority">
                        <SelectValue placeholder="Alle prioriteiten" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">Hoog</SelectItem>
                        <SelectItem value="medium">Middel</SelectItem>
                        <SelectItem value="low">Laag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.includeResolved}
                        onChange={(e) => setFilters({ ...filters, includeResolved: e.target.checked })}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">Inclusief opgeloste incidenten</span>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilters({
                          incidentStatus: '',
                          actionStatus: '',
                          actionPriority: '',
                          includeResolved: false,
                        });
                        setSearchQuery('');
                      }}
                    >
                      Filters Wissen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistieken */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-foreground">{actions.length}</div>
                  <p className="text-xs text-muted-foreground">Totaal Acties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-500">
                    {actions.filter(a => a.status === 'in_progress').length}
                  </div>
                  <p className="text-xs text-muted-foreground">In Uitvoering</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-destructive">
                    {actions.filter(a => a.priority === 'urgent' && a.status !== 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Urgente Acties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-chart-2">
                    {actions.filter(a => a.status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Voltooid</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Acties Lijst */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Acties laden...</div>
          ) : filteredActions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Geen acties gevonden met de geselecteerde filters.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActions.map((action) => {
                const priorityAccent = 
                  action.priority === 'urgent' ? 'border-l-4 border-l-destructive' :
                  action.priority === 'high' ? 'border-l-4 border-l-orange-500' :
                  action.priority === 'medium' ? 'border-l-4 border-l-chart-4' :
                  'border-l-4 border-l-chart-1';

                const StatusIcon = () => {
                  if (action.status === 'completed') {
                    return (
                      <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  }
                  if (action.status === 'in_progress') {
                    return (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  }
                  return (
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  );
                };

                return (
                  <Card key={action.id} className={`${priorityAccent} hover:shadow-md transition-all duration-200`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-3">
                            <StatusIcon />
                            <div className="flex-1">
                              <CardTitle className="text-lg">{action.title}</CardTitle>
                              <CardDescription className="mt-2 text-base leading-relaxed">
                                {action.description}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              action.priority === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              action.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                              action.priority === 'medium' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' :
                              'bg-chart-1/10 text-chart-1 border-chart-1/20'
                            }`}>
                              {getPriorityLabel(action.priority)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              action.status === 'completed' ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' :
                              action.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/20' :
                              action.status === 'approved' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' :
                              'bg-muted text-muted-foreground border-border'
                            }`}>
                              {getStatusLabel(action.status)}
                            </span>
                            {action.aiSuggested && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                AI
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Link href={`/dashboard/ai-safety/${action.incidentId}`}>
                          <Button variant="outline" size="sm">
                            Bekijk Incident
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Incident Info */}
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Incident</p>
                            <Link 
                              href={`/dashboard/ai-safety/${action.incidentId}`}
                              className="text-sm text-foreground font-medium hover:text-primary transition-colors"
                            >
                              {action.incident.incidentId}
                            </Link>
                            <p className="text-xs text-muted-foreground line-clamp-1">{action.incident.title}</p>
                          </div>
                        </div>

                        {action.actionHolder && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Actiehouder</p>
                              <p className="text-sm text-foreground font-medium">{action.actionHolder}</p>
                              {action.actionHolderEmail && (
                                <p className="text-xs text-muted-foreground">{action.actionHolderEmail}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {action.deadline && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Deadline</p>
                              <p className="text-sm text-foreground font-medium">{formatDate(action.deadline)}</p>
                              {new Date(action.deadline) < new Date() && action.status !== 'completed' && (
                                <p className="text-xs text-destructive">Verlopen</p>
                              )}
                            </div>
                          </div>
                        )}

                        {action.completedAt && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-chart-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Voltooid op</p>
                              <p className="text-sm text-foreground font-medium">{formatDate(action.completedAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

