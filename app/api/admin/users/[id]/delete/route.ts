import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/clerk-admin';

/**
 * DELETE /api/admin/users/[id]/delete
 * Verwijder een gebruiker permanent
 * Alleen toegankelijk voor admins
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Verwijder gebruiker (permissie checks gebeuren in de functie)
    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Gebruiker succesvol verwijderd',
      userId,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij verwijderen gebruiker' },
      { status: 500 }
    );
  }
}

