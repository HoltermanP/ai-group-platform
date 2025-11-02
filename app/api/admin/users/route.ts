import { NextResponse } from 'next/server';
import { getAllUsers, isAdmin } from '@/lib/clerk-admin';

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

