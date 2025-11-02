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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  organizations: Organization[];
  createdAt: number;
  lastSignInAt: number | null;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gebruikersbeheer</h1>
        <p className="text-muted-foreground">
          Beheer gebruikers en hun globale rollen binnen het platform
        </p>
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
                    <div className="text-sm text-muted-foreground">
                      {user.email}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

