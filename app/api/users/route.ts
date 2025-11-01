import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userPreferencesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/users/preferences - Haal user preferences op
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Haal user info van Clerk
    const user = await currentUser();

    // Haal preferences uit database
    const preferences = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    return NextResponse.json({
      user: {
        id: user?.id,
        email: user?.emailAddresses[0]?.emailAddress,
        firstName: user?.firstName,
        lastName: user?.lastName,
        imageUrl: user?.imageUrl,
      },
      preferences: preferences[0] || null,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/preferences - Update user preferences
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { theme, language, emailNotifications } = body;

    // Check of preferences al bestaan
    const existing = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    if (existing.length === 0) {
      // Creëer nieuwe preferences
      const [created] = await db
        .insert(userPreferencesTable)
        .values({
          clerkUserId: userId,
          theme: theme || 'theme-slate',
          language: language || 'nl',
          emailNotifications: emailNotifications ?? true,
        })
        .returning();

      return NextResponse.json(created);
    } else {
      // Update bestaande preferences
      const [updated] = await db
        .update(userPreferencesTable)
        .set({
          theme: theme || existing[0].theme,
          language: language || existing[0].language,
          emailNotifications: emailNotifications ?? existing[0].emailNotifications,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.clerkUserId, userId))
        .returning();

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

