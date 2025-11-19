'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Trash2, Edit, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface NotificationRule {
  id: number;
  name: string;
  description: string | null;
  recipientType: 'user' | 'team' | 'organization';
  recipientId: string;
  channels: string[];
  filters: {
    severity?: string[];
    category?: string[];
    discipline?: string[];
    organizationId?: number;
    projectId?: number;
  };
  organizationId: number | null;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Project {
  id: number;
  projectId: string;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Laag' },
  { value: 'medium', label: 'Middel' },
  { value: 'high', label: 'Hoog' },
  { value: 'critical', label: 'Kritiek' },
];

const CATEGORY_OPTIONS = [
  'graafschade',
  'lekkage',
  'verzakking',
  'corrosie',
  'obstructie',
  'elektrisch',
  'structureel',
  'verontreiniging',
  'overig',
];

const DISCIPLINE_OPTIONS = [
  'Elektra',
  'Gas',
  'Water',
  'Media',
  'Overig',
];

export default function NotificationRulesPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    recipientType: 'user' as 'user' | 'team' | 'organization',
    recipientId: '',
    channels: [] as string[],
    filters: {
      severity: [] as string[],
      category: [] as string[],
      discipline: [] as string[],
      organizationId: undefined as number | undefined,
    },
    organizationId: undefined as number | undefined,
    enabled: true,
  });

  useEffect(() => {
    fetchRules();
    fetchUsers();
    fetchProjects();
    fetchOrganizations();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/notification-rules');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Geen toegang - alleen voor admins');
        } else {
          setError('Fout bij ophalen notification rules');
        }
        return;
      }

      const data = await res.json();
      setRules(data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError('Fout bij ophalen notification rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?limit=1000');
      if (res.ok) {
        const result = await res.json();
        const data = result.data || result;
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/admin/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const handleOpenDialog = (rule?: NotificationRule) => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        recipientType: rule.recipientType,
        recipientId: rule.recipientId,
        channels: rule.channels,
        filters: {
          severity: rule.filters.severity || [],
          category: rule.filters.category || [],
          discipline: rule.filters.discipline || [],
          organizationId: rule.filters.organizationId,
        },
        organizationId: rule.organizationId || undefined,
        enabled: rule.enabled,
      });
      setSelectedRule(rule);
    } else {
      setFormData({
        name: '',
        description: '',
        recipientType: 'user',
        recipientId: '',
        channels: [],
        filters: {
          severity: [],
          category: [],
          discipline: [],
          organizationId: undefined,
        },
        organizationId: undefined,
        enabled: true,
      });
      setSelectedRule(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.recipientId || formData.channels.length === 0) {
      alert('Vul alle verplichte velden in en selecteer minimaal één kanaal');
      return;
    }

    setSaving(true);

    try {
      const url = selectedRule 
        ? '/api/admin/notification-rules'
        : '/api/admin/notification-rules';
      
      const method = selectedRule ? 'PUT' : 'POST';
      
      const body: {
        id?: number;
        name: string;
        description: string | null;
        recipientType: 'user' | 'team' | 'organization';
        recipientId: string;
        channels: string[];
        filters: {
          severity?: string[];
          category?: string[];
          discipline?: string[];
          organizationId?: number;
          projectId?: number;
        };
        organizationId: number | null;
        enabled: boolean;
      } = {
        ...(selectedRule ? { id: selectedRule.id } : {}),
        name: formData.name,
        description: formData.description || null,
        recipientType: formData.recipientType,
        recipientId: formData.recipientId,
        channels: formData.channels,
        filters: formData.filters,
        organizationId: formData.organizationId || null,
        enabled: formData.enabled,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij opslaan notification rule');
        return;
      }

      setDialogOpen(false);
      fetchRules();
    } catch (err) {
      console.error('Error saving rule:', err);
      alert('Fout bij opslaan notification rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;

    try {
      const res = await fetch(
        `/api/admin/notification-rules?id=${selectedRule.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen notification rule');
        return;
      }

      setDeleteDialogOpen(false);
      setSelectedRule(null);
      fetchRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
      alert('Fout bij verwijderen notification rule');
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const toggleFilter = (filterType: 'severity' | 'category' | 'discipline', value: string) => {
    setFormData(prev => {
      const current = prev.filters[filterType] || [];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [filterType]: newValue,
        },
      };
    });
  };

  const getRecipientName = (rule: NotificationRule): string => {
    if (rule.recipientType === 'user') {
      const user = users.find(u => u.id === rule.recipientId);
      return user ? `${user.firstName} ${user.lastName} (${user.email})` : rule.recipientId;
    } else if (rule.recipientType === 'team') {
      const project = projects.find(p => p.id === parseInt(rule.recipientId));
      return project ? `${project.projectId} - ${project.name}` : `Project ${rule.recipientId}`;
    } else {
      const org = organizations.find(o => o.id === parseInt(rule.recipientId));
      return org ? org.name : `Organisatie ${rule.recipientId}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notificatie Regels</CardTitle>
              <CardDescription>
                Beheer wanneer en aan wie notificaties worden verstuurd bij incidenten
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Regel Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedRule ? 'Notificatie Regel Bewerken' : 'Notificatie Regel Toevoegen'}
                  </DialogTitle>
                  <DialogDescription>
                    Configureer wanneer en aan wie notificaties worden verstuurd
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave}>
                  <div className="space-y-6 py-4">
                    {/* Naam en beschrijving */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Naam *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Bijv. Kritieke Graafschade Meldingen"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Beschrijving</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optionele beschrijving van deze regel"
                        rows={2}
                      />
                    </div>

                    {/* Recipient Type en Selectie */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipientType">Ontvanger Type *</Label>
                        <Select
                          value={formData.recipientType}
                          onValueChange={(value: 'user' | 'team' | 'organization') => {
                            setFormData({ ...formData, recipientType: value, recipientId: '' });
                          }}
                        >
                          <SelectTrigger id="recipientType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="team">Team (Project)</SelectItem>
                            <SelectItem value="organization">Organisatie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipientId">Ontvanger *</Label>
                        <select
                          id="recipientId"
                          value={formData.recipientId}
                          onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Selecteer...</option>
                          {formData.recipientType === 'user' && users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                          {formData.recipientType === 'team' && projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.projectId} - {project.name}
                            </option>
                          ))}
                          {formData.recipientType === 'organization' && organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Kanalen */}
                    <div className="space-y-2">
                      <Label>Kanalen *</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="channel-email"
                            checked={formData.channels.includes('email')}
                            onCheckedChange={() => toggleChannel('email')}
                          />
                          <Label htmlFor="channel-email" className="flex items-center gap-2 cursor-pointer">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="channel-whatsapp"
                            checked={formData.channels.includes('whatsapp')}
                            onCheckedChange={() => toggleChannel('whatsapp')}
                          />
                          <Label htmlFor="channel-whatsapp" className="flex items-center gap-2 cursor-pointer">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="channel-in_app"
                            checked={formData.channels.includes('in_app')}
                            onCheckedChange={() => toggleChannel('in_app')}
                          />
                          <Label htmlFor="channel-in_app" className="flex items-center gap-2 cursor-pointer">
                            <Bell className="h-4 w-4" />
                            In-app notificatie
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="space-y-4 border-t pt-4">
                      <Label className="text-base font-semibold">Filters - Wanneer moet deze regel actief zijn?</Label>
                      
                      {/* Severity Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm">Ernst (leeg = alle)</Label>
                        <div className="flex flex-wrap gap-2">
                          {SEVERITY_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`severity-${option.value}`}
                                checked={formData.filters.severity.includes(option.value)}
                                onCheckedChange={() => toggleFilter('severity', option.value)}
                              />
                              <Label htmlFor={`severity-${option.value}`} className="cursor-pointer text-sm">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm">Categorie (leeg = alle)</Label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_OPTIONS.map((category) => (
                            <div key={category} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category}`}
                                checked={formData.filters.category.includes(category)}
                                onCheckedChange={() => toggleFilter('category', category)}
                              />
                              <Label htmlFor={`category-${category}`} className="cursor-pointer text-sm capitalize">
                                {category}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Discipline Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm">Discipline (leeg = alle)</Label>
                        <div className="flex flex-wrap gap-2">
                          {DISCIPLINE_OPTIONS.map((discipline) => (
                            <div key={discipline} className="flex items-center space-x-2">
                              <Checkbox
                                id={`discipline-${discipline}`}
                                checked={formData.filters.discipline.includes(discipline)}
                                onCheckedChange={() => toggleFilter('discipline', discipline)}
                              />
                              <Label htmlFor={`discipline-${discipline}`} className="cursor-pointer text-sm">
                                {discipline}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Organisatie Scope */}
                      <div className="space-y-2">
                        <Label htmlFor="filterOrganizationId" className="text-sm">
                          Organisatie Scope (optioneel - alleen incidenten van deze organisatie)
                        </Label>
                        <select
                          id="filterOrganizationId"
                          value={formData.filters.organizationId || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            filters: {
                              ...formData.filters,
                              organizationId: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Alle organisaties</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Enabled */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                      />
                      <Label htmlFor="enabled">Regel ingeschakeld</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Annuleren
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nog geen notification rules geconfigureerd.</p>
              <p className="text-sm mt-2">
                Voeg regels toe om te bepalen wanneer en aan wie notificaties worden verstuurd.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Ontvanger</TableHead>
                  <TableHead>Kanalen</TableHead>
                  <TableHead>Filters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {rule.recipientType === 'user' ? 'Gebruiker' : 
                           rule.recipientType === 'team' ? 'Team' : 'Organisatie'}
                        </Badge>
                        <span className="text-sm">{getRecipientName(rule)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.channels.includes('email') && (
                          <Badge variant="secondary" className="gap-1">
                            <Mail className="h-3 w-3" />
                            Email
                          </Badge>
                        )}
                        {rule.channels.includes('whatsapp') && (
                          <Badge variant="secondary" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </Badge>
                        )}
                        {rule.channels.includes('in_app') && (
                          <Badge variant="secondary" className="gap-1">
                            <Bell className="h-3 w-3" />
                            In-app
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {rule.filters.severity && rule.filters.severity.length > 0 && (
                          <div>Ernst: {rule.filters.severity.join(', ')}</div>
                        )}
                        {rule.filters.category && rule.filters.category.length > 0 && (
                          <div>Categorie: {rule.filters.category.join(', ')}</div>
                        )}
                        {rule.filters.discipline && rule.filters.discipline.length > 0 && (
                          <div>Discipline: {rule.filters.discipline.join(', ')}</div>
                        )}
                        {rule.filters.organizationId && (
                          <div>Org ID: {rule.filters.organizationId}</div>
                        )}
                        {(!rule.filters.severity || rule.filters.severity.length === 0) &&
                         (!rule.filters.category || rule.filters.category.length === 0) &&
                         (!rule.filters.discipline || rule.filters.discipline.length === 0) &&
                         !rule.filters.organizationId && (
                          <span className="text-muted-foreground">Geen filters (alle incidenten)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Actief' : 'Uitgeschakeld'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(rule)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRule(rule);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notificatie Regel Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je de regel &quot;{selectedRule?.name}&quot; wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

