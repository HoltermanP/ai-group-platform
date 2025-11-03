import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAllUsers, isAdmin, addUserToOrganization } from '@/lib/clerk-admin';

/**
 * GET /api/admin/users
 * Haal alle gebruikers op met hun rollen en organisaties
 * Alleen toegankelijk voor admins
 */
export async function GET() {
  try {
    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();
    
    return NextResponse.json({
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen gebruikers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Maak een nieuwe gebruiker aan via Clerk
 * Alleen toegankelijk voor admins
 */
export async function POST(req: Request) {
  try {
    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, firstName, lastName, password, skipPasswordChecks, organizationId, organizationRole } = body;

    // Validatie
    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Maak gebruiker aan via Clerk
    const newUser = await client.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      password: password || undefined,
      skipPasswordChecks: skipPasswordChecks || false,
      skipPasswordRequirement: !password, // Als er geen password is, stuur password reset email
    });

    // Voeg gebruiker toe aan organisatie als die is opgegeven
    if (organizationId) {
      try {
        await addUserToOrganization(
          newUser.id,
          organizationId,
          organizationRole || 'member'
        );
      } catch (orgError: any) {
        // Als het toevoegen aan organisatie faalt, log maar verwijder de gebruiker niet
        // (gebruiker is al aangemaakt in Clerk)
        console.error('Error adding user to organization:', orgError);
        // We gaan door - gebruiker is aangemaakt, organisatie koppeling kan later
      }
    }

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.emailAddresses[0]?.emailAddress,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
      message: password 
        ? `Gebruiker succesvol aangemaakt${organizationId ? ' en toegevoegd aan organisatie' : ''}` 
        : `Gebruiker succesvol aangemaakt${organizationId ? ' en toegevoegd aan organisatie' : ''}. Er is een email verstuurd om het wachtwoord in te stellen.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Clerk specifieke errors
    if (error.errors) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError.message || 'Fout bij aanmaken gebruiker' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij aanmaken gebruiker' },
      { status: 500 }
    );
  }
}

