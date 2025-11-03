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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MoreVertical, Ban, Trash2, ShieldCheck } from 'lucide-react';
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

interface Organization {
  id: number;
  name: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  globalRole: 'super_admin' | 'admin' | 'user';
  banned: boolean;
  organizations: Organization[];
  createdAt: number;
  lastSignInAt: number | null;
}

interface OrganizationOption {
  id: number;
  name: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Delete/Ban confirmation dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    organizationId: '',
    organizationRole: 'member',
  });

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Geen toegang - alleen voor admins');
        } else {
          setError('Fout bij ophalen gebruikers');
        }
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Fout bij ophalen gebruikers');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij updaten rol');
        return;
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, globalRole: newRole as User['globalRole'] } : u
      ));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Fout bij updaten rol');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          password: formData.password || undefined,
          organizationId: formData.organizationId && formData.organizationId !== 'none' ? parseInt(formData.organizationId) : undefined,
          organizationRole: formData.organizationRole || 'member',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Fout bij aanmaken gebruiker');
        return;
      }

      // Reset form
      setFormData({ 
        email: '', 
        firstName: '', 
        lastName: '', 
        password: '',
        organizationId: '',
        organizationRole: 'member',
      });
      setDialogOpen(false);
      
      // Refresh users list
      await fetchUsers();
      
      // Show success message
      alert(data.message || 'Gebruiker succesvol aangemaakt');
    } catch (err) {
      console.error('Error creating user:', err);
      setCreateError('Fout bij aanmaken gebruiker');
    } finally {
      setCreating(false);
    }
  };

  const handleBanUser = async (user: User) => {
    try {
      const endpoint = user.banned ? `/api/admin/users/${user.id}/unban` : `/api/admin/users/${user.id}/ban`;
      const res = await fetch(endpoint, { method: 'POST' });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij blokkeren/deblokkeren gebruiker');
        return;
      }

      await fetchUsers();
      setBanDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error banning user:', err);
      alert('Fout bij blokkeren/deblokkeren gebruiker');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/delete`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen gebruiker');
        return;
      }

      await fetchUsers();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Fout bij verwijderen gebruiker');
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      default: return 'Gebruiker';
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gebruikersbeheer</h1>
          <p className="text-muted-foreground">
            Beheer gebruikers en hun globale rollen binnen het platform
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Gebruiker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Gebruiker Aanmaken</DialogTitle>
              <DialogDescription>
                Maak een nieuwe gebruiker aan. Als je geen wachtwoord invult, 
                ontvangt de gebruiker een email om een wachtwoord in te stellen.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="gebruiker@voorbeeld.nl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Voornaam</Label>
                  <Input
                    id="firstName"
                    placeholder="Jan"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Achternaam</Label>
                  <Input
                    id="lastName"
                    placeholder="Jansen"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Wachtwoord (optioneel)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Laat leeg om email te versturen"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Als je geen wachtwoord invult, ontvangt de gebruiker een email 
                    om een wachtwoord in te stellen.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organizationId">Organisatie (optioneel)</Label>
                  <Select
                    value={formData.organizationId || undefined}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setFormData({ ...formData, organizationId: '' });
                      } else {
                        setFormData({ ...formData, organizationId: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een organisatie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen organisatie</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.organizationId && formData.organizationId !== 'none' && (
                  <div className="grid gap-2">
                    <Label htmlFor="organizationRole">Rol in Organisatie</Label>
                    <Select
                      value={formData.organizationRole}
                      onValueChange={(value) => setFormData({ ...formData, organizationRole: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Lid</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Eigenaar</SelectItem>
                      </SelectContent>
                    </Select>
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
                  onClick={() => {
                    setDialogOpen(false);
                    setFormData({ 
                      email: '', 
                      firstName: '', 
                      lastName: '', 
                      password: '',
                      organizationId: '',
                      organizationRole: 'member',
                    });
                    setCreateError(null);
                  }}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Aanmaken...' : 'Gebruiker Aanmaken'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Gebruikers ({users.length})</CardTitle>
          <CardDescription>
            Bekijk en beheer gebruikersrollen en organisatie-lidmaatschappen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gebruiker</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Globale Rol</TableHead>
                <TableHead>Organisaties</TableHead>
                <TableHead>Laatste Login</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.imageUrl} alt={user.email} />
                        <AvatarFallback>
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'Geen naam'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      {user.banned && (
                        <Badge variant="destructive" className="text-xs">
                          Geblokkeerd
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.globalRole)}>
                      {getRoleLabel(user.globalRole)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.organizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.organizations.slice(0, 2).map((org) => (
                          <Badge key={org.id} variant="outline" className="text-xs">
                            {org.name}
                          </Badge>
                        ))}
                        {user.organizations.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.organizations.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Geen organisaties
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {user.lastSignInAt
                        ? new Date(user.lastSignInAt).toLocaleDateString('nl-NL')
                        : 'Nooit'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.globalRole}
                        onValueChange={(value) => updateRole(user.id, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Gebruiker</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setBanDialogOpen(true);
                            }}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {user.banned ? 'Deblokkeer' : 'Blokkeer'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ban/Unban Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.banned ? 'Gebruiker deblokkeren?' : 'Gebruiker blokkeren?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.banned
                ? `Weet je zeker dat je ${selectedUser.email} wilt deblokkeren? De gebruiker krijgt weer toegang tot het platform.`
                : `Weet je zeker dat je ${selectedUser?.email} wilt blokkeren? De gebruiker verliest toegang tot het platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleBanUser(selectedUser)}
              className={selectedUser?.banned ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {selectedUser?.banned ? 'Deblokkeer' : 'Blokkeer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {selectedUser?.email} permanent wilt verwijderen? 
              Deze actie kan niet ongedaan worden gemaakt. Alle data van deze gebruiker 
              wordt verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

