import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { organizationsTable, userRolesTable, organizationMembersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/setup
 * Eerste setup van het platform - maakt eerste organisatie en admin aan
 * Kan alleen gebruikt worden als er nog geen super_admin bestaat
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Check of er al een super_admin bestaat
    const existingAdmins = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.role, 'super_admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Setup is al uitgevoerd. Er bestaat al een super admin.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { organizationName, organizationSlug } = body;

    // Validatie
    if (!organizationName || !organizationSlug) {
      return NextResponse.json(
        { error: 'Organisatie naam en slug zijn verplicht' },
        { status: 400 }
      );
    }

    // Check of slug al bestaat
    const existingOrg = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, organizationSlug))
      .limit(1);

    if (existingOrg.length > 0) {
      return NextResponse.json(
        { error: 'Een organisatie met deze slug bestaat al' },
        { status: 400 }
      );
    }

    // Stap 1: Maak organisatie aan
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        name: organizationName,
        slug: organizationSlug,
        description: 'Hoofd organisatie',
        createdBy: userId,
        status: 'active',
      })
      .returning();

    // Stap 2: Maak gebruiker super_admin
    await db.insert(userRolesTable).values({
      clerkUserId: userId,
      role: 'super_admin',
      assignedBy: userId,
      notes: 'Eerste admin aangemaakt tijdens setup',
    });

    // Stap 3: Voeg gebruiker toe aan organisatie als owner
    await db.insert(organizationMembersTable).values({
      organizationId: newOrg.id,
      clerkUserId: userId,
      role: 'owner',
      invitedBy: userId,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Setup succesvol voltooid',
      organization: newOrg,
    }, { status: 201 });
  } catch (error) {
    console.error('Error during setup:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij de setup. Check of de database tabellen zijn aangemaakt.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup
 * Check of setup al is uitgevoerd
 */
export async function GET() {
  try {
    // Check of er al een super_admin bestaat
    const existingAdmins = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.role, 'super_admin'))
      .limit(1);

    return NextResponse.json({
      setupCompleted: existingAdmins.length > 0,
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json({
      setupCompleted: false,
      error: 'Kon setup status niet controleren. Mogelijk zijn de database tabellen nog niet aangemaakt.',
    });
  }
}

