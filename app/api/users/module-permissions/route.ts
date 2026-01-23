import { NextResponse } from 'next/server';
import { safeAuth } from '@/lib/auth-wrapper';
import { getUserModulePermissions } from '@/lib/clerk-admin';

/**
 * GET /api/users/module-permissions
 * Haal module rechten op van de huidige gebruiker
 */
export async function GET() {
  try {
    const { userId } = await safeAuth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserModulePermissions(userId);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching module permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

