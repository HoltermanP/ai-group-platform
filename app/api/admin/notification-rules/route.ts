import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notificationRulesTable, projectsTable, organizationsTable } from "@/lib/db/schema";
import { isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

// GET - Haal alle notification rules op
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const rules = await db
      .select()
      .from(notificationRulesTable)
      .orderBy(notificationRulesTable.createdAt);

    // Parse JSON velden
    const rulesWithParsed = rules.map(rule => ({
      ...rule,
      channels: JSON.parse(rule.channels),
      filters: JSON.parse(rule.filters),
    }));

    return NextResponse.json(rulesWithParsed);
  } catch (error) {
    console.error("Error fetching notification rules:", error);
    return NextResponse.json(
      { error: "Fout bij ophalen notification rules" },
      { status: 500 }
    );
  }
}

// POST - Maak nieuwe notification rule aan
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      recipientType,
      recipientId,
      channels,
      filters,
      organizationId,
      enabled,
    } = body;

    // Validatie
    if (!name || !recipientType || !recipientId || !channels || !filters) {
      return NextResponse.json(
        { error: "Naam, recipient type, recipient ID, kanalen en filters zijn verplicht" },
        { status: 400 }
      );
    }

    // Valideer recipient type
    if (!['user', 'team', 'organization'].includes(recipientType)) {
      return NextResponse.json(
        { error: "Recipient type moet 'user', 'team' of 'organization' zijn" },
        { status: 400 }
      );
    }

    // Valideer channels
    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: "Kanalen moeten een array zijn met minimaal één kanaal" },
        { status: 400 }
      );
    }

    const validChannels = ['email', 'whatsapp', 'in_app'];
    const invalidChannels = channels.filter((c: string) => !validChannels.includes(c));
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { error: `Ongeldige kanalen: ${invalidChannels.join(', ')}. Geldige kanalen: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    // Valideer recipient bestaat
    if (recipientType === 'team') {
      const projectId = parseInt(recipientId);
      if (isNaN(projectId)) {
        return NextResponse.json(
          { error: "Team ID moet een geldig nummer zijn" },
          { status: 400 }
        );
      }
      const project = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId))
        .limit(1);
      if (project.length === 0) {
        return NextResponse.json(
          { error: "Project niet gevonden" },
          { status: 404 }
        );
      }
    } else if (recipientType === 'organization') {
      const orgId = parseInt(recipientId);
      if (isNaN(orgId)) {
        return NextResponse.json(
          { error: "Organisatie ID moet een geldig nummer zijn" },
          { status: 400 }
        );
      }
      const org = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, orgId))
        .limit(1);
      if (org.length === 0) {
        return NextResponse.json(
          { error: "Organisatie niet gevonden" },
          { status: 404 }
        );
      }
    }

    // Maak nieuwe rule aan
    const newRule = await db
      .insert(notificationRulesTable)
      .values({
        name,
        description: description || null,
        recipientType,
        recipientId,
        channels: JSON.stringify(channels),
        filters: JSON.stringify(filters),
        organizationId: organizationId || null,
        enabled: enabled !== undefined ? enabled : true,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({
      ...newRule[0],
      channels: JSON.parse(newRule[0].channels),
      filters: JSON.parse(newRule[0].filters),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating notification rule:", error);
    return NextResponse.json(
      { error: "Fout bij aanmaken notification rule" },
      { status: 500 }
    );
  }
}

// PUT - Update notification rule
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, channels, filters, enabled } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Rule ID is verplicht" },
        { status: 400 }
      );
    }

    // Check of rule bestaat
    const existing = await db
      .select()
      .from(notificationRulesTable)
      .where(eq(notificationRulesTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Notification rule niet gevonden" },
        { status: 404 }
      );
    }

    // Update data
    const updateData: Partial<typeof notificationRulesTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (channels !== undefined) updateData.channels = JSON.stringify(channels);
    if (filters !== undefined) updateData.filters = JSON.stringify(filters);
    if (enabled !== undefined) updateData.enabled = enabled;

    const updated = await db
      .update(notificationRulesTable)
      .set(updateData)
      .where(eq(notificationRulesTable.id, id))
      .returning();

    return NextResponse.json({
      ...updated[0],
      channels: JSON.parse(updated[0].channels),
      filters: JSON.parse(updated[0].filters),
    });
  } catch (error) {
    console.error("Error updating notification rule:", error);
    return NextResponse.json(
      { error: "Fout bij updaten notification rule" },
      { status: 500 }
    );
  }
}

// DELETE - Verwijder notification rule
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Rule ID is verplicht" },
        { status: 400 }
      );
    }

    await db
      .delete(notificationRulesTable)
      .where(eq(notificationRulesTable.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification rule:", error);
    return NextResponse.json(
      { error: "Fout bij verwijderen notification rule" },
      { status: 500 }
    );
  }
}

