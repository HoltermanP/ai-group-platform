import { NextResponse } from 'next/server';
import { updateUserGlobalRole, type GlobalRole } from '@/lib/clerk-admin';

/**
 * PATCH /api/admin/users/[id]/role
 * Update de globale rol van een gebruiker
 * Alleen toegankelijk voor admins
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { role } = await req.json();

    // Valideer rol
    const validRoles: GlobalRole[] = ['super_admin', 'admin', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Ongeldige rol. Gebruik: super_admin, admin, of user' },
        { status: 400 }
      );
    }

    // Update rol (permissie checks gebeuren in de functie)
    await updateUserGlobalRole(userId, role);

    return NextResponse.json({
      success: true,
      message: 'Rol succesvol gewijzigd',
      userId,
      newRole: role,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    
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

