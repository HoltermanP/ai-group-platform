import { safeAuth } from '@/lib/auth-wrapper';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { toolboxesTable } from '@/lib/db/schema';
import { eq, or, isNull, inArray } from 'drizzle-orm';
import { getUserOrganizationIds } from '@/lib/clerk-admin';
import ToolboxenClient from './toolboxen-client';

export const dynamic = 'force-dynamic';

// Voorkom static generation

export default async function ToolboxenPage() {
  const { userId } = await safeAuth();

  if (!userId) {
    redirect('/');
  }

  // Haal organisatie IDs op voor filtering
  const userOrgIds = await getUserOrganizationIds(userId);

  // Haal toolboxen op
  let rawToolboxes;
  if (userOrgIds.length > 0) {
    rawToolboxes = await db
      .select()
      .from(toolboxesTable)
      .where(
        or(
          inArray(toolboxesTable.organizationId, userOrgIds),
          isNull(toolboxesTable.organizationId)
        )
      )
      .orderBy(toolboxesTable.createdAt);
  } else {
    // Admin: toon alles
    rawToolboxes = await db
      .select()
      .from(toolboxesTable)
      .orderBy(toolboxesTable.createdAt);
  }

  // Converteer Date objecten naar strings voor client component
  const toolboxes = rawToolboxes.map(toolbox => ({
    ...toolbox,
    createdAt: toolbox.createdAt.toISOString(),
    updatedAt: toolbox.updatedAt.toISOString(),
  }));

  return <ToolboxenClient initialToolboxes={toolboxes} />;
}

