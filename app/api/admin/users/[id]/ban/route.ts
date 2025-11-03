import { NextResponse } from 'next/server';
import { banUser } from '@/lib/clerk-admin';

/**
 * POST /api/admin/users/[id]/ban
 * Blokkeer een gebruiker
 * Alleen toegankelijk voor admins
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Blokkeer gebruiker (permissie checks gebeuren in de functie)
    await banUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Gebruiker succesvol geblokkeerd',
      userId,
    });
  } catch (error) {
    console.error('Error banning user:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij blokkeren gebruiker' },
      { status: 500 }
    );
  }
}

