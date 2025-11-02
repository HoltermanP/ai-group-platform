'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  status: string;
}

interface Member {
  id: number;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  role: string;
  status: string;
  joinedAt: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  useEffect(() => {
    if (orgId) {
      fetchOrganization();
      fetchMembers();
    }
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/organizations/${orgId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In productie zou je hier een echte user lookup doen
    // Voor nu gebruiken we de email als userId (dit moet aangepast worden)
    alert('Lid toevoegen functionaliteit moet nog worden geïmplementeerd met user search');
    setIsAddMemberDialogOpen(false);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij updaten rol');
        return;
      }

      // Update local state
      setMembers(members.map(m => 
        m.userId === userId ? { ...m, role: newRole } : m
      ));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Fout bij updaten rol');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Weet je zeker dat je dit lid wilt verwijderen?')) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/organizations/${orgId}/members?userId=${userId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen lid');
        return;
      }

      // Update local state
      setMembers(members.filter(m => m.userId !== userId));
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Fout bij verwijderen lid');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="destructive">Owner</Badge>;
      case 'admin':
        return <Badge variant="default">Admin</Badge>;
      case 'manager':
        return <Badge>Manager</Badge>;
      case 'member':
        return <Badge variant="secondary">Lid</Badge>;
      case 'viewer':
        return <Badge variant="outline">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    return email[0].toUpperCase();
  };

  if (!organization) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/admin/organizations')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar overzicht
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-muted-foreground">{organization.description}</p>
          </div>
          <Badge>{organization.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisatie Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Slug:</span>
              <div><code className="text-sm">{organization.slug}</code></div>
            </div>
            {organization.website && (
              <div>
                <span className="text-sm text-muted-foreground">Website:</span>
                <div>
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {organization.website}
                  </a>
                </div>
              </div>
            )}
            {organization.contactEmail && (
              <div>
                <span className="text-sm text-muted-foreground">Contact:</span>
                <div className="text-sm">{organization.contactEmail}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistieken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Aantal Leden:</span>
              <div className="text-2xl font-bold">{members.length}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Actieve Leden:</span>
              <div className="text-2xl font-bold">
                {members.filter(m => m.status === 'active').length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leden ({members.length})</CardTitle>
            <CardDescription>
              Beheer leden en hun rollen binnen deze organisatie
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddMemberDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Lid Toevoegen
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Laden...</p>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nog geen leden in deze organisatie
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Toegevoegd op</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.imageUrl} alt={member.email} />
                          <AvatarFallback>
                            {getInitials(member.firstName, member.lastName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.firstName || member.lastName
                              ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                              : 'Geen naam'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString('nl-NL')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.userId, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="member">Lid</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>Lid Toevoegen</DialogTitle>
              <DialogDescription>
                Voeg een gebruiker toe aan deze organisatie
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="gebruiker@voorbeeld.nl"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Email van een bestaande gebruiker in het platform
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="role">Rol *</Label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="member">Lid</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMemberDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit">
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

