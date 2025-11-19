import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { criticalIncidentRecipientsTable } from "@/lib/db/schema";
import { getAllUsers, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// GET - Haal alle ontvangers op
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const recipients = await db
      .select()
      .from(criticalIncidentRecipientsTable)
      .orderBy(criticalIncidentRecipientsTable.createdAt);

    // Haal gebruikersdata op via Clerk
    const allUsers = await getAllUsers();
    const recipientsWithUserData = recipients.map(recipient => {
      const user = allUsers.find(u => u.id === recipient.clerkUserId);
      return {
        ...recipient,
        user: user ? {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      };
    });

    return NextResponse.json(recipientsWithUserData);
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Fout bij ophalen ontvangers" },
      { status: 500 }
    );
  }
}

// POST - Voeg ontvanger toe of update bestaande
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await req.json();
    const { clerkUserId, phoneNumber, enabled } = body;

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Gebruiker ID is verplicht" },
        { status: 400 }
      );
    }

    // Check of al bestaat
    const existing = await db
      .select()
      .from(criticalIncidentRecipientsTable)
      .where(eq(criticalIncidentRecipientsTable.clerkUserId, clerkUserId))
      .limit(1);

    if (existing.length > 0) {
      // Update bestaande
      const updated = await db
        .update(criticalIncidentRecipientsTable)
        .set({
          phoneNumber: phoneNumber !== undefined ? phoneNumber : existing[0].phoneNumber,
          enabled: enabled !== undefined ? enabled : existing[0].enabled,
          updatedAt: new Date(),
        })
        .where(eq(criticalIncidentRecipientsTable.clerkUserId, clerkUserId))
        .returning();

      return NextResponse.json(updated[0]);
    } else {
      // Maak nieuwe
      const newRecipient = await db
        .insert(criticalIncidentRecipientsTable)
        .values({
          clerkUserId,
          phoneNumber: phoneNumber || null,
          enabled: enabled !== undefined ? enabled : true,
          addedBy: userId,
        })
        .returning();

      return NextResponse.json(newRecipient[0], { status: 201 });
    }
  } catch (error) {
    console.error("Error adding/updating recipient:", error);
    return NextResponse.json(
      { error: "Fout bij toevoegen/updaten ontvanger" },
      { status: 500 }
    );
  }
}

// DELETE - Verwijder ontvanger
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const clerkUserId = searchParams.get("clerkUserId");

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Gebruiker ID is verplicht" },
        { status: 400 }
      );
    }

    await db
      .delete(criticalIncidentRecipientsTable)
      .where(eq(criticalIncidentRecipientsTable.clerkUserId, clerkUserId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipient:", error);
    return NextResponse.json(
      { error: "Fout bij verwijderen ontvanger" },
      { status: 500 }
    );
  }
}

