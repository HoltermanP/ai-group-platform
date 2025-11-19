import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notificationsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";

// GET - Haal notificaties op voor ingelogde gebruiker
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const whereConditions = unreadOnly
      ? and(
          eq(notificationsTable.clerkUserId, userId),
          eq(notificationsTable.read, false)
        )
      : eq(notificationsTable.clerkUserId, userId);

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(whereConditions)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Fout bij ophalen notificaties" },
      { status: 500 }
    );
  }
}

// PUT - Markeer notificatie(s) als gelezen
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Markeer alle notificaties van deze gebruiker als gelezen
      await db
        .update(notificationsTable)
        .set({
          read: true,
          readAt: new Date(),
        })
        .where(eq(notificationsTable.clerkUserId, userId));

      return NextResponse.json({ success: true, message: "Alle notificaties gemarkeerd als gelezen" });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notificatie ID is verplicht" },
        { status: 400 }
      );
    }

    // Markeer specifieke notificatie als gelezen
    await db
      .update(notificationsTable)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(eq(notificationsTable.id, notificationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Fout bij updaten notificatie" },
      { status: 500 }
    );
  }
}

