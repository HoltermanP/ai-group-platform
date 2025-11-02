import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { organizationsTable, organizationMembersTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * GET /api/admin/organizations
 * Haal alle organisaties op met aantal leden
 * Toegankelijk voor admins en gebruikers (gebruikers zien alleen hun eigen orgs)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const isUserAdmin = await isAdmin();

    let organizations;

    if (isUserAdmin) {
      // Admins zien alle organisaties
      organizations = await db
        .select({
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          description: organizationsTable.description,
          logo: organizationsTable.logo,
          website: organizationsTable.website,
          contactEmail: organizationsTable.contactEmail,
          status: organizationsTable.status,
          createdBy: organizationsTable.createdBy,
          createdAt: organizationsTable.createdAt,
          memberCount: sql<number>`cast(count(${organizationMembersTable.id}) as integer)`,
        })
        .from(organizationsTable)
        .leftJoin(
          organizationMembersTable,
          eq(organizationsTable.id, organizationMembersTable.organizationId)
        )
        .groupBy(organizationsTable.id)
        .orderBy(desc(organizationsTable.createdAt));
    } else {
      // Normale gebruikers zien alleen hun eigen organisaties
      organizations = await db
        .select({
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          description: organizationsTable.description,
          logo: organizationsTable.logo,
          website: organizationsTable.website,
          contactEmail: organizationsTable.contactEmail,
          status: organizationsTable.status,
          role: organizationMembersTable.role,
          createdAt: organizationsTable.createdAt,
          memberCount: sql<number>`1`, // Placeholder, kan later uitgebreid worden
        })
        .from(organizationMembersTable)
        .innerJoin(
          organizationsTable,
          eq(organizationMembersTable.organizationId, organizationsTable.id)
        )
        .where(eq(organizationMembersTable.clerkUserId, userId))
        .orderBy(desc(organizationsTable.createdAt));
    }

    return NextResponse.json({
      organizations,
      total: organizations.length,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen organisaties' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations
 * Maak een nieuwe organisatie aan
 * Alleen toegankelijk voor admins
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

    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      description,
      website,
      contactEmail,
      contactPhone,
      address,
    } = body;

    // Validatie
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Naam en slug zijn verplicht' },
        { status: 400 }
      );
    }

    // Check of slug al bestaat
    const existing = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Een organisatie met deze slug bestaat al' },
        { status: 400 }
      );
    }

    // Maak organisatie aan
    const [newOrg] = await db
      .insert(organizationsTable)
      .values({
        name,
        slug,
        description: description || null,
        website: website || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        createdBy: userId,
        status: 'active',
      })
      .returning();

    // Maak creator automatisch owner
    await db.insert(organizationMembersTable).values({
      organizationId: newOrg.id,
      clerkUserId: userId,
      role: 'owner',
      invitedBy: userId,
      status: 'active',
    });

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Fout bij aanmaken organisatie' },
      { status: 500 }
    );
  }
}

