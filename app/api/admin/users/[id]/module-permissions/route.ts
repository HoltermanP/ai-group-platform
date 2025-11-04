import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setModulePermission, getUserModulePermissions, ModuleType } from '@/lib/clerk-admin';

/**
 * GET /api/admin/users/[id]/module-permissions
 * Haal module rechten op van een specifieke gebruiker (admin only)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin rechten gebeurt in setModulePermission
    const { id } = await params;
    const permissions = await getUserModulePermissions(id);
    
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching module permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]/module-permissions
 * Update module rechten van een gebruiker (admin only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { module, granted, notes } = body;

    if (!module || typeof granted !== 'boolean') {
      return NextResponse.json(
        { error: 'Module en granted zijn verplicht' },
        { status: 400 }
      );
    }

    if (!['ai-safety', 'ai-schouw', 'ai-toezicht'].includes(module)) {
      return NextResponse.json(
        { error: 'Ongeldige module' },
        { status: 400 }
      );
    }

    await setModulePermission(id, module as ModuleType, granted, notes);
    
    const permissions = await getUserModulePermissions(id);
    
    return NextResponse.json({ 
      success: true,
      permissions 
    });
  } catch (error) {
    console.error('Error updating module permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

