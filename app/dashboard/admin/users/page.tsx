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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MoreVertical, Ban, Trash2, ShieldCheck, Building2, X, Key } from 'lucide-react';
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

interface ModulePermissions {
  'ai-safety': boolean;
  'ai-schouw': boolean;
  'ai-toezicht': boolean;
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
  
  // Organization management dialog
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [addingOrg, setAddingOrg] = useState(false);
  const [orgFormData, setOrgFormData] = useState({
    organizationId: '',
    role: 'member',
  });
  
  // Module permissions management dialog
  const [modulePermissionsDialogOpen, setModulePermissionsDialogOpen] = useState(false);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({
    'ai-safety': false,
    'ai-schouw': false,
    'ai-toezicht': false,
  });
  
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

  const openModulePermissionsDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/module-permissions`);
      if (res.ok) {
        const data = await res.json();
        setModulePermissions(data.permissions);
      } else {
        // Default permissions als er een fout is
        setModulePermissions({
          'ai-safety': false,
          'ai-schouw': false,
          'ai-toezicht': false,
        });
      }
    } catch (error) {
      console.error('Error fetching module permissions:', error);
      setModulePermissions({
        'ai-safety': false,
        'ai-schouw': false,
        'ai-toezicht': false,
      });
    }
    setModulePermissionsDialogOpen(true);
  };

  const updateModulePermission = async (module: keyof ModulePermissions, granted: boolean) => {
    if (!selectedUser) return;

    setUpdatingPermissions(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/module-permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, granted }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij updaten module rechten');
        return;
      }

      const data = await res.json();
      setModulePermissions(data.permissions);
    } catch (err) {
      console.error('Error updating module permission:', err);
      alert('Fout bij updaten module rechten');
    } finally {
      setUpdatingPermissions(false);
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

  const handleAddUserToOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setAddingOrg(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgFormData.organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: orgFormData.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Fout bij toevoegen aan organisatie');
        return;
      }

      // Reset form
      setOrgFormData({ organizationId: '', role: 'member' });
      
      // Refresh users list
      await fetchUsers();
      
      alert('Gebruiker succesvol toegevoegd aan organisatie');
    } catch (err) {
      console.error('Error adding user to organization:', err);
      alert('Fout bij toevoegen aan organisatie');
    } finally {
      setAddingOrg(false);
    }
  };

  const handleRemoveUserFromOrganization = async (userId: string, orgId: number) => {
    if (!confirm('Weet je zeker dat je deze gebruiker uit deze organisatie wilt verwijderen?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen uit organisatie');
        return;
      }

      await fetchUsers();
    } catch (err) {
      console.error('Error removing user from organization:', err);
      alert('Fout bij verwijderen uit organisatie');
    }
  };

  const handleUpdateOrganizationRole = async (userId: string, orgId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij updaten rol');
        return;
      }

      await fetchUsers();
    } catch (err) {
      console.error('Error updating organization role:', err);
      alert('Fout bij updaten rol');
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
                <TableHead>Module Rechten</TableHead>
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
                        {user.organizations.map((org) => (
                          <Link
                            key={org.id}
                            href={`/dashboard/admin/organizations/${org.id}`}
                            className="inline-block"
                          >
                            <Badge variant="outline" className="text-xs hover:bg-accent cursor-pointer">
                              {org.name} ({org.role})
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Geen organisaties
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModulePermissionsDialog(user)}
                      className="text-xs"
                    >
                      <Key className="mr-2 h-3 w-3" />
                      Beheer
                    </Button>
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
                              setOrgDialogOpen(true);
                              setOrgFormData({ organizationId: '', role: 'member' });
                            }}
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedUser(user);
                              setOrgDialogOpen(true);
                              setOrgFormData({ organizationId: '', role: 'member' });
                            }}
                          >
                            <Building2 className="mr-2 h-4 w-4" />
                            Organisaties beheren
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openModulePermissionsDialog(user)}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Module rechten
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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

      {/* Organization Management Dialog */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Organisaties beheren voor {selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              Voeg deze gebruiker toe aan organisaties of beheer bestaande lidmaatschappen
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Organizations */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Huidige Organisaties</h3>
              {selectedUser?.organizations && selectedUser.organizations.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">Rol: {org.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={org.role}
                          onValueChange={(value) =>
                            selectedUser && handleUpdateOrganizationRole(selectedUser.id, org.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => selectedUser && handleRemoveUserFromOrganization(selectedUser.id, org.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Deze gebruiker is nog niet gekoppeld aan organisaties
                </p>
              )}
            </div>

            {/* Add to Organization Form */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Toevoegen aan Organisatie</h3>
              <form onSubmit={handleAddUserToOrganization}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orgSelect">Organisatie</Label>
                    <Select
                      value={orgFormData.organizationId}
                      onValueChange={(value) =>
                        setOrgFormData({ ...orgFormData, organizationId: value })
                      }
                    >
                      <SelectTrigger id="orgSelect">
                        <SelectValue placeholder="Selecteer een organisatie" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations
                          .filter(
                            (org) =>
                              !selectedUser?.organizations.some((userOrg) => userOrg.id === org.id)
                          )
                          .map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {orgFormData.organizationId && (
                    <div className="grid gap-2">
                      <Label htmlFor="orgRole">Rol in Organisatie</Label>
                      <Select
                        value={orgFormData.role}
                        onValueChange={(value) =>
                          setOrgFormData({ ...orgFormData, role: value })
                        }
                      >
                        <SelectTrigger id="orgRole">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={addingOrg || !orgFormData.organizationId}
                  >
                    {addingOrg ? 'Toevoegen...' : 'Toevoegen aan Organisatie'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Permissions Dialog */}
      <Dialog open={modulePermissionsDialogOpen} onOpenChange={setModulePermissionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Module Rechten Beheren</DialogTitle>
            <DialogDescription>
              Beheer module toegang voor {selectedUser?.email}
              {selectedUser?.globalRole === 'admin' || selectedUser?.globalRole === 'super_admin' ? (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Admins hebben standaard toegang tot alle modules.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-safety" className="text-base font-medium">
                  AI-Veiligheid
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toegang tot veiligheidsmeldingen module
                </p>
              </div>
              <Switch
                id="ai-safety"
                checked={modulePermissions['ai-safety']}
                onCheckedChange={(checked) => updateModulePermission('ai-safety', checked)}
                disabled={updatingPermissions || selectedUser?.globalRole === 'admin' || selectedUser?.globalRole === 'super_admin'}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-schouw" className="text-base font-medium">
                  AI-Schouw
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toegang tot schouwen module
                </p>
              </div>
              <Switch
                id="ai-schouw"
                checked={modulePermissions['ai-schouw']}
                onCheckedChange={(checked) => updateModulePermission('ai-schouw', checked)}
                disabled={updatingPermissions || selectedUser?.globalRole === 'admin' || selectedUser?.globalRole === 'super_admin'}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-toezicht" className="text-base font-medium">
                  AI-Toezicht
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toegang tot toezicht module
                </p>
              </div>
              <Switch
                id="ai-toezicht"
                checked={modulePermissions['ai-toezicht']}
                onCheckedChange={(checked) => updateModulePermission('ai-toezicht', checked)}
                disabled={updatingPermissions || selectedUser?.globalRole === 'admin' || selectedUser?.globalRole === 'super_admin'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModulePermissionsDialogOpen(false)}
            >
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

