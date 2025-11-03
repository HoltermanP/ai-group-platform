import { NextResponse } from 'next/server';
import { unbanUser } from '@/lib/clerk-admin';

/**
 * POST /api/admin/users/[id]/unban
 * Deblokkeer een gebruiker
 * Alleen toegankelijk voor admins
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Deblokkeer gebruiker (permissie checks gebeuren in de functie)
    await unbanUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Gebruiker succesvol gedeblokkeerd',
      userId,
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Fout bij deblokkeren gebruiker' },
      { status: 500 }
    );
  }
}

