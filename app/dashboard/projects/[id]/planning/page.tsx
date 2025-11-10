"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, Edit, Trash2, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: number;
  projectId: string;
  name: string;
  startDate: string | null;
  plannedEndDate: string | null;
}

interface Task {
  id: number;
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  plannedDuration: number | null;
  assignedToName: string | null;
  progress: number;
  dependencies: string | null;
}

export default function ProjectPlanningPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    taskId: "",
    title: "",
    description: "",
    status: "not_started",
    priority: "medium",
    type: "task",
    startDate: "",
    endDate: "",
    plannedDuration: "",
    assignedToName: "",
    progress: 0,
  });

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchProject(id);
      fetchTasks(id);
    }
  }, [params.id]);

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    try {
      if (editingTask) {
        // Update bestaande taak
        const response = await fetch(`/api/projects/${id}/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          setShowTaskDialog(false);
          setEditingTask(null);
          resetForm();
          fetchTasks(id!);
        }
      } else {
        // Maak nieuwe taak aan
        const response = await fetch(`/api/projects/${id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          setShowTaskDialog(false);
          resetForm();
          fetchTasks(id!);
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      taskId: task.taskId,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      type: task.type,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
      endDate: task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "",
      plannedDuration: task.plannedDuration?.toString() || "",
      assignedToName: task.assignedToName || "",
      progress: task.progress,
    });
    setShowTaskDialog(true);
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return;
    
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTasks(id!);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      taskId: "",
      title: "",
      description: "",
      status: "not_started",
      priority: "medium",
      type: "task",
      startDate: "",
      endDate: "",
      plannedDuration: "",
      assignedToName: "",
      progress: 0,
    });
    setEditingTask(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("nl-NL");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-chart-1" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-chart-2" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: "Niet gestart",
      in_progress: "Bezig",
      completed: "Voltooid",
      blocked: "Geblokkeerd",
      cancelled: "Geannuleerd",
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      urgent: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[priority] || "bg-muted text-muted-foreground";
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/dashboard/projects/${params.id}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar project
            </Link>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Projectplanning
                </h1>
                {project && (
                  <p className="text-muted-foreground">
                    {project.name} ({project.projectId})
                  </p>
                )}
              </div>
              
              <Dialog open={showTaskDialog} onOpenChange={(open) => {
                setShowTaskDialog(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Taak
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTask ? "Taak Bewerken" : "Nieuwe Taak Aanmaken"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="taskId">Taak ID *</Label>
                        <Input
                          id="taskId"
                          value={formData.taskId}
                          onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                          required
                          placeholder="TASK-2024-001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="task">Taak</SelectItem>
                            <SelectItem value="milestone">Mijlpaal</SelectItem>
                            <SelectItem value="phase">Fase</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="title">Titel *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Beschrijving</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Niet gestart</SelectItem>
                            <SelectItem value="in_progress">Bezig</SelectItem>
                            <SelectItem value="completed">Voltooid</SelectItem>
                            <SelectItem value="blocked">Geblokkeerd</SelectItem>
                            <SelectItem value="cancelled">Geannuleerd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Prioriteit</Label>
                        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                          <SelectTrigger id="priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Laag</SelectItem>
                            <SelectItem value="medium">Middel</SelectItem>
                            <SelectItem value="high">Hoog</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="startDate">Startdatum</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">Einddatum</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="plannedDuration">Geplande duur (dagen)</Label>
                        <Input
                          id="plannedDuration"
                          type="number"
                          value={formData.plannedDuration}
                          onChange={(e) => setFormData({ ...formData, plannedDuration: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="assignedToName">Toegewezen aan</Label>
                        <Input
                          id="assignedToName"
                          value={formData.assignedToName}
                          onChange={(e) => setFormData({ ...formData, assignedToName: e.target.value })}
                          placeholder="Naam van persoon"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="progress">Voortgang (%)</Label>
                      <Input
                        id="progress"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progress}
                        onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit">
                        {editingTask ? "Bijwerken" : "Aanmaken"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6 text-card-foreground flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Taken ({tasks.length})
              </h2>

              {tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nog geen taken aangemaakt</p>
                  <p className="text-sm mt-2">Klik op "Nieuwe Taak" om te beginnen</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-semibold text-foreground">{task.title}</h3>
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {getPriorityLabel(task.priority)}
                            </Badge>
                            <Badge variant="secondary">{task.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.taskId} • {getStatusLabel(task.status)}
                          </p>
                          {task.description && (
                            <p className="text-sm text-foreground mb-3">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {task.startDate && (
                              <span>Start: {formatDate(task.startDate)}</span>
                            )}
                            {task.endDate && (
                              <span>Eind: {formatDate(task.endDate)}</span>
                            )}
                            {task.assignedToName && (
                              <span>Toegewezen: {task.assignedToName}</span>
                            )}
                            <span>Voortgang: {task.progress}%</span>
                          </div>
                          {task.progress > 0 && (
                            <div className="mt-2 w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

