import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { organizationsTable } from '@/lib/db/schema';
import { isAdmin, isOrganizationAdmin } from '@/lib/clerk-admin';
import { eq } from 'drizzle-orm';

/**
 * GET /api/admin/organizations/[id]
 * Haal een specifieke organisatie op
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    const [organization] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organisatie niet gevonden' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen organisatie' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/organizations/[id]
 * Update een organisatie
 * Alleen voor admins of org owners
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    // Check rechten
    const isGlobalAdmin = await isAdmin();
    const isOrgAdmin = await isOrganizationAdmin(userId, orgId);

    if (!isGlobalAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'Geen toegang om deze organisatie te bewerken' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      website,
      contactEmail,
      contactPhone,
      address,
      status,
    } = body;

    // Update organisatie
    const [updated] = await db
      .update(organizationsTable)
      .set({
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        website: website !== undefined ? website : undefined,
        contactEmail: contactEmail !== undefined ? contactEmail : undefined,
        contactPhone: contactPhone !== undefined ? contactPhone : undefined,
        address: address !== undefined ? address : undefined,
        status: status !== undefined ? status : undefined,
        updatedAt: new Date(),
      })
      .where(eq(organizationsTable.id, orgId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Fout bij updaten organisatie' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/organizations/[id]
 * Verwijder een organisatie
 * Alleen voor super admins
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Alleen admins kunnen organisaties verwijderen
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    // Verwijder organisatie (cascade deletes members automatisch)
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, orgId));

    return NextResponse.json({
      success: true,
      message: 'Organisatie succesvol verwijderd',
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Fout bij verwijderen organisatie' },
      { status: 500 }
    );
  }
}

