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
    const {
      // Algemene voorkeuren
      theme,
      language,
      timezone,
      dateFormat,
      timeFormat,
      // Dashboard voorkeuren
      dashboardLayout,
      itemsPerPage,
      defaultDashboardSection,
      // Kaart voorkeuren
      mapSettings,
      // Notificatie voorkeuren
      emailNotifications,
      notificationPreferences,
      // Filter voorkeuren
      defaultFilters,
      // Sortering voorkeuren
      defaultSorting,
      // AI voorkeuren
      aiAutoAnalysis,
      defaultAIModel,
      showAISuggestions,
      autoGenerateToolbox,
      aiSafetyIncidentPrompt,
      // Organisatie voorkeuren
      defaultOrganizationId,
      // Weergave voorkeuren
      compactMode,
      autoRefresh,
      autoRefreshInterval,
    } = body;

    // Check of preferences al bestaan
    const existing = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    // Bereid update object voor - alleen velden die zijn opgegeven worden bijgewerkt
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Algemene voorkeuren
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (timeFormat !== undefined) updateData.timeFormat = timeFormat;

    // Dashboard voorkeuren
    if (dashboardLayout !== undefined) updateData.dashboardLayout = dashboardLayout;
    if (itemsPerPage !== undefined) updateData.itemsPerPage = itemsPerPage;
    if (defaultDashboardSection !== undefined) updateData.defaultDashboardSection = defaultDashboardSection;

    // Kaart voorkeuren
    if (mapSettings !== undefined) updateData.mapSettings = typeof mapSettings === 'string' ? mapSettings : JSON.stringify(mapSettings);

    // Notificatie voorkeuren
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (notificationPreferences !== undefined) updateData.notificationPreferences = typeof notificationPreferences === 'string' ? notificationPreferences : JSON.stringify(notificationPreferences);

    // Filter voorkeuren
    if (defaultFilters !== undefined) updateData.defaultFilters = typeof defaultFilters === 'string' ? defaultFilters : JSON.stringify(defaultFilters);

    // Sortering voorkeuren
    if (defaultSorting !== undefined) updateData.defaultSorting = typeof defaultSorting === 'string' ? defaultSorting : JSON.stringify(defaultSorting);

    // AI voorkeuren
    if (aiAutoAnalysis !== undefined) updateData.aiAutoAnalysis = aiAutoAnalysis;
    if (defaultAIModel !== undefined) updateData.defaultAIModel = defaultAIModel;
    if (showAISuggestions !== undefined) updateData.showAISuggestions = showAISuggestions;
    if (autoGenerateToolbox !== undefined) updateData.autoGenerateToolbox = autoGenerateToolbox;
    if (aiSafetyIncidentPrompt !== undefined) updateData.aiSafetyIncidentPrompt = aiSafetyIncidentPrompt || null;

    // Organisatie voorkeuren
    if (defaultOrganizationId !== undefined) updateData.defaultOrganizationId = defaultOrganizationId;

    // Weergave voorkeuren
    if (compactMode !== undefined) updateData.compactMode = compactMode;
    if (autoRefresh !== undefined) updateData.autoRefresh = autoRefresh;
    if (autoRefreshInterval !== undefined) updateData.autoRefreshInterval = autoRefreshInterval;

    if (existing.length === 0) {
      // Creëer nieuwe preferences met defaults
      const [created] = await db
        .insert(userPreferencesTable)
        .values({
          clerkUserId: userId,
          theme: theme || 'theme-slate',
          language: language || 'nl',
          timezone: timezone || 'Europe/Amsterdam',
          dateFormat: dateFormat || 'DD-MM-YYYY',
          timeFormat: timeFormat || '24h',
          dashboardLayout: dashboardLayout || 'standard',
          itemsPerPage: itemsPerPage || 25,
          emailNotifications: emailNotifications ?? true,
          aiAutoAnalysis: aiAutoAnalysis ?? false,
          defaultAIModel: defaultAIModel || 'gpt-4',
          showAISuggestions: showAISuggestions ?? true,
          autoGenerateToolbox: autoGenerateToolbox ?? false,
          aiSafetyIncidentPrompt: aiSafetyIncidentPrompt || null,
          compactMode: compactMode ?? false,
          autoRefresh: autoRefresh ?? true,
          autoRefreshInterval: autoRefreshInterval || 30000,
          mapSettings: mapSettings ? (typeof mapSettings === 'string' ? mapSettings : JSON.stringify(mapSettings)) : null,
          notificationPreferences: notificationPreferences ? (typeof notificationPreferences === 'string' ? notificationPreferences : JSON.stringify(notificationPreferences)) : null,
          defaultFilters: defaultFilters ? (typeof defaultFilters === 'string' ? defaultFilters : JSON.stringify(defaultFilters)) : null,
          defaultSorting: defaultSorting ? (typeof defaultSorting === 'string' ? defaultSorting : JSON.stringify(defaultSorting)) : null,
          defaultOrganizationId: defaultOrganizationId || null,
          defaultDashboardSection: defaultDashboardSection || null,
        })
        .returning();

      return NextResponse.json(created);
    } else {
      // Update bestaande preferences - merge met bestaande waarden
      const [updated] = await db
        .update(userPreferencesTable)
        .set(updateData)
        .where(eq(userPreferencesTable.clerkUserId, userId))
        .returning();

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

