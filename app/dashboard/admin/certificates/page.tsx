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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MoreVertical, Edit, Trash2, X, Database } from 'lucide-react';
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

interface Certificate {
  id: number;
  name: string;
  description: string | null;
  discipline: string;
  expires: boolean;
  validityYears: number | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const DISCIPLINES = ['Elektra', 'Gas', 'Water', 'Media', 'Algemeen'];

export default function CertificatesManagementPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  
  // Filter
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discipline: 'Algemeen',
    expires: false,
    validityYears: '',
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/certificates');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Geen toegang - alleen voor admins');
        } else {
          setError('Fout bij ophalen certificaten');
        }
        return;
      }

      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Fout bij ophalen certificaten');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCertificate(null);
    setFormData({
      name: '',
      description: '',
      discipline: 'Algemeen',
      expires: false,
      validityYears: '',
    });
    setCreateError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setFormData({
      name: certificate.name,
      description: certificate.description || '',
      discipline: certificate.discipline,
      expires: certificate.expires,
      validityYears: certificate.validityYears?.toString() || '',
    });
    setCreateError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        discipline: formData.discipline,
        expires: formData.expires,
        validityYears: formData.expires ? parseInt(formData.validityYears) : null,
      };

      let res;
      if (editingCertificate) {
        res = await fetch(`/api/admin/certificates/${editingCertificate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const error = await res.json();
        setCreateError(error.error || 'Fout bij opslaan certificaat');
        return;
      }

      setDialogOpen(false);
      fetchCertificates();
    } catch (err) {
      console.error('Error saving certificate:', err);
      setCreateError('Fout bij opslaan certificaat');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!certificateToDelete) return;

    try {
      const res = await fetch(`/api/admin/certificates/${certificateToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen certificaat');
        return;
      }

      setDeleteDialogOpen(false);
      setCertificateToDelete(null);
      fetchCertificates();
    } catch (err) {
      console.error('Error deleting certificate:', err);
      alert('Fout bij verwijderen certificaat');
    }
  };

  const handleSeedCertificates = async () => {
    if (!confirm('Weet je zeker dat je de standaard certificaten wilt toevoegen? Bestaande certificaten worden overgeslagen.')) {
      return;
    }

    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/certificates/seed', {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        setSeedResult(`Fout: ${error.error || 'Onbekende fout'}`);
        return;
      }

      const data = await res.json();
      setSeedResult(data.message || 'Certificaten succesvol toegevoegd');
      fetchCertificates(); // Refresh de lijst
    } catch (err) {
      console.error('Error seeding certificates:', err);
      setSeedResult('Fout bij seeden certificaten');
    } finally {
      setSeeding(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => 
    disciplineFilter === 'all' || cert.discipline === disciplineFilter
  );

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Certificaten Beheer</h1>
          <p className="text-muted-foreground mt-1">
            Beheer de catalogus van beschikbare diploma's en certificaten
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSeedCertificates} variant="outline" disabled={seeding}>
            <Database className="mr-2 h-4 w-4" />
            {seeding ? 'Seeden...' : 'Seed Standaard Certificaten'}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Certificaat
          </Button>
        </div>
      </div>
      {seedResult && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className={seedResult.includes('Fout') ? 'text-destructive' : 'text-green-600'}>
              {seedResult}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Certificaten</CardTitle>
              <CardDescription>
                Overzicht van alle beschikbare certificaten en diploma's
              </CardDescription>
            </div>
            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter op discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle disciplines</SelectItem>
                {DISCIPLINES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCertificates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen certificaten gevonden
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Discipline</TableHead>
                  <TableHead>Verloopt</TableHead>
                  <TableHead>Geldigheid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell className="font-medium">{certificate.name}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {certificate.description || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{certificate.discipline}</Badge>
                    </TableCell>
                    <TableCell>
                      {certificate.expires ? (
                        <Badge variant="secondary">Ja</Badge>
                      ) : (
                        <Badge variant="outline">Nee</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {certificate.expires && certificate.validityYears
                        ? `${certificate.validityYears} jaar`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={certificate.status === 'active' ? 'default' : 'secondary'}
                      >
                        {certificate.status === 'active' ? 'Actief' : 'Inactief'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(certificate)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCertificateToDelete(certificate);
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCertificate ? 'Certificaat Bewerken' : 'Nieuw Certificaat'}
            </DialogTitle>
            <DialogDescription>
              {editingCertificate
                ? 'Wijzig de gegevens van het certificaat'
                : 'Voeg een nieuw certificaat of diploma toe aan de catalogus'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Bijv. VCA Basis"
                />
              </div>
              <div>
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschrijving van het certificaat..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="discipline">Discipline *</Label>
                <Select
                  value={formData.discipline}
                  onValueChange={(value) => setFormData({ ...formData, discipline: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="expires"
                  checked={formData.expires}
                  onCheckedChange={(checked) => setFormData({ ...formData, expires: checked })}
                />
                <Label htmlFor="expires">Certificaat verloopt</Label>
              </div>
              {formData.expires && (
                <div>
                  <Label htmlFor="validityYears">Geldigheidstermijn (jaren) *</Label>
                  <Input
                    id="validityYears"
                    type="number"
                    min="1"
                    value={formData.validityYears}
                    onChange={(e) => setFormData({ ...formData, validityYears: e.target.value })}
                    required={formData.expires}
                    placeholder="Bijv. 5"
                  />
                </div>
              )}
              {createError && (
                <div className="text-sm text-destructive">{createError}</div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Opslaan...' : editingCertificate ? 'Bijwerken' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Certificaat Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je het certificaat &quot;{certificateToDelete?.name}&quot; wilt verwijderen?
              Alle toekenningen van dit certificaat aan medewerkers worden ook verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

