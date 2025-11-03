import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/clerk-admin';

/**
 * GET /api/admin/check
 * Lightweight check om te zien of gebruiker admin is
 * Gebruikt door admin-nav om te bepalen of menu moet worden getoond
 */
export async function GET() {
  try {
    const admin = await isAdmin();
    
    return NextResponse.json({
      isAdmin: admin,
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { isAdmin: false, error: 'Fout bij checken admin status' },
      { status: 500 }
    );
  }
}

