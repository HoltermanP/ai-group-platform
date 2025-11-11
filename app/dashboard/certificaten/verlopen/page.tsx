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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Certificate {
  id: number;
  name: string;
  description: string | null;
  discipline: string;
  expires: boolean;
  validityYears: number | null;
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

export default function VerlopenCertificatenPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalExpired, setTotalExpired] = useState(0);

  useEffect(() => {
    fetchExpiredCertificates();
  }, []);

  const fetchExpiredCertificates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/certificates/expired');
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Geen toegang - alleen voor admins');
        } else {
          setError('Fout bij ophalen verlopen certificaten');
        }
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalExpired(data.total || 0);
    } catch (err) {
      console.error('Error fetching expired certificates:', err);
      setError('Fout bij ophalen verlopen certificaten');
    } finally {
      setLoading(false);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            Verlopen Certificaten
          </h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van alle verlopen certificaten per medewerker
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchExpiredCertificates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Verversen
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/certificaten">Terug naar Certificaten</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Verlopen Certificaten</CardTitle>
              <CardDescription>
                {totalExpired} verlopen certificaat{totalExpired !== 1 ? 'en' : ''} van {users.length} medewerker{users.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Geen verlopen certificaten</p>
              <p className="text-muted-foreground">
                Alle certificaten zijn nog geldig
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.map((user) => (
                <Card key={user.id} className="border-destructive/20">
                  <CardHeader>
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
                      <Badge variant="destructive" className="ml-auto">
                        {user.certificates.length} verlopen
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Certificaat</TableHead>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead>Discipline</TableHead>
                          <TableHead>Behaald</TableHead>
                          <TableHead>Verlopen op</TableHead>
                          <TableHead>Dagen verlopen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.certificates.map((uc) => {
                          const expiryDate = new Date(uc.expiryDate!);
                          const now = new Date();
                          const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));

                          return (
                            <TableRow key={uc.id} className="bg-destructive/5">
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
                                <span className="text-destructive font-medium">
                                  {expiryDate.toLocaleDateString('nl-NL')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {daysExpired} dag{daysExpired !== 1 ? 'en' : ''}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

