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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Award, Trash2, Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';
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
}

interface UserCertificate {
  id: number;
  certificateId: number;
  achievedDate: string;
  expiryDate: string | null;
  status: string;
  notes: string | null;
  certificate: Certificate;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  certificates: UserCertificate[];
}

export default function CertificatenPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [availableCertificates, setAvailableCertificates] = useState<Certificate[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<UserCertificate | null>(null);
  
  const [assignFormData, setAssignFormData] = useState({
    certificateId: '',
    achievedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Haal gebruikers met certificaten op
      const usersRes = await fetch('/api/certificates/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
      
      // Haal beschikbare certificaten op
      const certsRes = await fetch('/api/admin/certificates');
      if (certsRes.ok) {
        const certsData = await certsRes.json();
        setAvailableCertificates(certsData.certificates?.filter((c: Certificate) => c.status === 'active') || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fout bij ophalen gegevens');
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (user: User) => {
    setSelectedUser(user);
    setAssignFormData({
      certificateId: '',
      achievedDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setAssignDialogOpen(true);
  };

  const handleAssignCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignFormData),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij toekennen certificaat');
        return;
      }

      setAssignDialogOpen(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error assigning certificate:', err);
      alert('Fout bij toekennen certificaat');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteCertificate = async () => {
    if (!certificateToDelete || !selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/certificates/${certificateToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen certificaat');
        return;
      }

      setDeleteDialogOpen(false);
      setCertificateToDelete(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error deleting certificate:', err);
      alert('Fout bij verwijderen certificaat');
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

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
            Overzicht van certificaten per medewerker
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/certificaten/verlopen">
            <AlertCircle className="mr-2 h-4 w-4" />
            Verlopen Certificaten
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Medewerkers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek medewerker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen medewerkers gevonden
            </p>
          ) : (
            <div className="space-y-6">
              {filteredUsers.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback>
                            {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {user.firstName} {user.lastName}
                          </CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={() => openAssignDialog(user)}
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Certificaat Toekennen
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {user.certificates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Geen certificaten toegekend
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Certificaat</TableHead>
                            <TableHead>Omschrijving</TableHead>
                            <TableHead>Discipline</TableHead>
                            <TableHead>Behaald</TableHead>
                            <TableHead>Verloopt</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.certificates.map((uc) => {
                            const isExpired = uc.status === 'expired' || 
                              (uc.expiryDate && new Date(uc.expiryDate) < new Date());
                            
                            return (
                            <TableRow 
                              key={uc.id}
                              className={isExpired ? 'bg-destructive/5' : ''}
                            >
                              <TableCell className="font-medium">
                                {uc.certificate.name}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {uc.certificate.description || '-'}
                                </p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {uc.certificate.discipline}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(uc.achievedDate).toLocaleDateString('nl-NL')}
                              </TableCell>
                              <TableCell>
                                {uc.expiryDate ? (
                                  isExpired ? (
                                    <span className="text-destructive font-medium">
                                      {new Date(uc.expiryDate).toLocaleDateString('nl-NL')}
                                    </span>
                                  ) : (
                                    new Date(uc.expiryDate).toLocaleDateString('nl-NL')
                                  )
                                ) : (
                                  'Verloopt niet'
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    uc.status === 'active'
                                      ? 'default'
                                      : uc.status === 'expired'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {uc.status === 'active'
                                    ? 'Actief'
                                    : uc.status === 'expired'
                                    ? 'Verlopen'
                                    : 'Ingetrokken'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setCertificateToDelete(uc);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Certificate Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certificaat Toekennen</DialogTitle>
            <DialogDescription>
              Ken een certificaat toe aan {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignCertificate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="certificateSelect">Certificaat *</Label>
                <Select
                  value={assignFormData.certificateId}
                  onValueChange={(value) =>
                    setAssignFormData({ ...assignFormData, certificateId: value })
                  }
                  required
                >
                  <SelectTrigger id="certificateSelect">
                    <SelectValue placeholder="Selecteer een certificaat" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCertificates.map((cert) => (
                      <SelectItem key={cert.id} value={cert.id.toString()}>
                        {cert.name} ({cert.discipline})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="achievedDate">Datum Behaald *</Label>
                <Input
                  id="achievedDate"
                  type="date"
                  value={assignFormData.achievedDate}
                  onChange={(e) =>
                    setAssignFormData({ ...assignFormData, achievedDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  value={assignFormData.notes}
                  onChange={(e) =>
                    setAssignFormData({ ...assignFormData, notes: e.target.value })
                  }
                  placeholder="Optionele notities..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={assigning}>
                {assigning ? 'Toekennen...' : 'Toekennen'}
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
              Weet je zeker dat je het certificaat &quot;{certificateToDelete?.certificate.name}&quot; wilt verwijderen van {selectedUser?.firstName} {selectedUser?.lastName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCertificate}
              className="bg-destructive text-destructive-foreground"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

