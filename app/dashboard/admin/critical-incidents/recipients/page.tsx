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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MoreVertical, Trash2, MessageSquare, Mail, X } from 'lucide-react';
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

interface Recipient {
  id: number;
  clerkUserId: string;
  phoneNumber: string | null;
  enabled: boolean;
  addedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}

export default function CriticalIncidentRecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  
  const [formData, setFormData] = useState({
    clerkUserId: '',
    phoneNumber: '',
    enabled: true,
  });

  useEffect(() => {
    fetchRecipients();
    fetchUsers();
  }, []);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/critical-incident-recipients');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Geen toegang - alleen voor admins');
        } else {
          setError('Fout bij ophalen ontvangers');
        }
        return;
      }

      const data = await res.json();
      setRecipients(data || []);
    } catch (err) {
      console.error('Error fetching recipients:', err);
      setError('Fout bij ophalen ontvangers');
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

  const handleOpenDialog = (recipient?: Recipient) => {
    if (recipient) {
      setFormData({
        clerkUserId: recipient.clerkUserId,
        phoneNumber: recipient.phoneNumber || '',
        enabled: recipient.enabled,
      });
      setSelectedRecipient(recipient);
    } else {
      setFormData({
        clerkUserId: '',
        phoneNumber: '',
        enabled: true,
      });
      setSelectedRecipient(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/critical-incident-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: formData.clerkUserId,
          phoneNumber: formData.phoneNumber || null,
          enabled: formData.enabled,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij opslaan ontvanger');
        return;
      }

      setDialogOpen(false);
      fetchRecipients();
    } catch (err) {
      console.error('Error saving recipient:', err);
      alert('Fout bij opslaan ontvanger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecipient) return;

    try {
      const res = await fetch(
        `/api/admin/critical-incident-recipients?clerkUserId=${selectedRecipient.clerkUserId}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Fout bij verwijderen ontvanger');
        return;
      }

      setDeleteDialogOpen(false);
      setSelectedRecipient(null);
      fetchRecipients();
    } catch (err) {
      console.error('Error deleting recipient:', err);
      alert('Fout bij verwijderen ontvanger');
    }
  };

  const availableUsers = users.filter(
    user => !recipients.some(r => r.clerkUserId === user.id)
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ontvangers voor Kritieke Incidenten</CardTitle>
              <CardDescription>
                Beheer gebruikers die automatisch notificaties ontvangen bij ernstige incidenten
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ontvanger Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedRecipient ? 'Ontvanger Bewerken' : 'Ontvanger Toevoegen'}
                  </DialogTitle>
                  <DialogDescription>
                    Selecteer een gebruiker en configureer notificatie-instellingen
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="clerkUserId">Gebruiker *</Label>
                      <select
                        id="clerkUserId"
                        value={formData.clerkUserId}
                        onChange={(e) => setFormData({ ...formData, clerkUserId: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                        disabled={!!selectedRecipient}
                      >
                        <option value="">Selecteer gebruiker...</option>
                        {(selectedRecipient
                          ? users.filter(u => u.id === selectedRecipient.clerkUserId)
                          : availableUsers
                        ).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">
                        WhatsApp Telefoonnummer (optioneel)
                      </Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+31612345678"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Voer het nummer in E.164 formaat in (bijv. +31612345678). 
                        WhatsApp notificaties worden alleen verstuurd als Twilio is geconfigureerd.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                      />
                      <Label htmlFor="enabled">Notificaties ingeschakeld</Label>
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
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nog geen ontvangers geconfigureerd.</p>
              <p className="text-sm mt-2">
                Voeg gebruikers toe die notificaties moeten ontvangen bij kritieke incidenten.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {recipient.user?.firstName?.[0] || recipient.user?.email?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {recipient.user?.firstName} {recipient.user?.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipient.user?.email || 'Onbekend'}
                    </TableCell>
                    <TableCell>
                      {recipient.phoneNumber ? (
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{recipient.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Niet ingesteld</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipient.enabled ? 'default' : 'secondary'}>
                        {recipient.enabled ? 'Actief' : 'Uitgeschakeld'}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(recipient)}>
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRecipient(recipient);
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
            <AlertDialogTitle>Ontvanger Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze ontvanger wilt verwijderen? Deze gebruiker zal geen
              notificaties meer ontvangen bij kritieke incidenten.
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

