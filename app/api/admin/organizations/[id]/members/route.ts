import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { organizationMembersTable } from '@/lib/db/schema';
import { isAdmin, isOrganizationAdmin, addUserToOrganization, removeUserFromOrganization, updateUserOrganizationRole, type OrganizationRole } from '@/lib/clerk-admin';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/admin/organizations/[id]/members
 * Haal alle leden van een organisatie op
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

    // Haal members op uit database
    const members = await db
      .select()
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, orgId));

    // Haal Clerk user data op voor elk lid
    const client = await clerkClient();
    const membersWithUserData = await Promise.all(
      members.map(async (member) => {
        try {
          const user = await client.users.getUser(member.clerkUserId);
          return {
            id: member.id,
            userId: member.clerkUserId,
            email: user.emailAddresses[0]?.emailAddress || '',
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            role: member.role,
            status: member.status,
            joinedAt: member.joinedAt,
          };
        } catch (error) {
          console.error(`Error fetching user ${member.clerkUserId}:`, error);
          return {
            id: member.id,
            userId: member.clerkUserId,
            email: 'Onbekend',
            firstName: null,
            lastName: null,
            imageUrl: '',
            role: member.role,
            status: member.status,
            joinedAt: member.joinedAt,
          };
        }
      })
    );

    return NextResponse.json({
      members: membersWithUserData,
      total: membersWithUserData.length,
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen leden' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations/[id]/members
 * Voeg een lid toe aan een organisatie
 */
export async function POST(
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

    const body = await req.json();
    const { userId: targetUserId, role = 'member' } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId is verplicht' },
        { status: 400 }
      );
    }

    // Voeg gebruiker toe (permissie checks in functie)
    await addUserToOrganization(targetUserId, orgId, role as OrganizationRole);

    return NextResponse.json({
      success: true,
      message: 'Gebruiker toegevoegd aan organisatie',
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Unauthorized') ? 403 : 400 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij toevoegen lid' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/organizations/[id]/members/[userId]
 * Update de rol van een lid
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    const body = await req.json();
    const { userId: targetUserId, role } = body;

    if (!targetUserId || !role) {
      return NextResponse.json(
        { error: 'userId en role zijn verplicht' },
        { status: 400 }
      );
    }

    // Update rol (permissie checks in functie)
    await updateUserOrganizationRole(targetUserId, orgId, role as OrganizationRole);

    return NextResponse.json({
      success: true,
      message: 'Rol succesvol gewijzigd',
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij updaten rol' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/organizations/[id]/members/[userId]
 * Verwijder een lid uit een organisatie
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId is verplicht' },
        { status: 400 }
      );
    }

    // Verwijder gebruiker (permissie checks in functie)
    await removeUserFromOrganization(targetUserId, orgId);

    return NextResponse.json({
      success: true,
      message: 'Gebruiker verwijderd uit organisatie',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij verwijderen lid' },
      { status: 500 }
    );
  }
}

