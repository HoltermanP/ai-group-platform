import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from './db';
import { userRolesTable, organizationMembersTable, organizationsTable, userPreferencesTable, userModulePermissionsTable } from './db/schema';
import { eq, and } from 'drizzle-orm';

export type ModuleType = 'ai-safety' | 'ai-schouw' | 'ai-toezicht';

// ============================================
// TYPES
// ============================================

export type GlobalRole = 'super_admin' | 'admin' | 'user';
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  globalRole: GlobalRole;
  banned: boolean;
  organizations: Array<{
    id: number;
    name: string;
    role: OrganizationRole;
  }>;
}

// ============================================
// GLOBAL ROLE CHECKS
// ============================================

/**
 * Check of de huidige gebruiker een super admin is
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const role = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, userId))
    .limit(1);

  return role[0]?.role === 'super_admin';
}

/**
 * Check of de huidige gebruiker een admin is (super_admin of admin)
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const role = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, userId))
    .limit(1);

  return role[0]?.role === 'super_admin' || role[0]?.role === 'admin';
}

/**
 * Haal de globale rol van een gebruiker op
 */
export async function getUserGlobalRole(userId: string): Promise<GlobalRole> {
  const role = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, userId))
    .limit(1);

  return (role[0]?.role as GlobalRole) || 'user';
}

// ============================================
// ORGANIZATION ROLE CHECKS
// ============================================

/**
 * Check of gebruiker owner of admin is van een organisatie
 */
export async function isOrganizationAdmin(
  userId: string,
  organizationId: number
): Promise<boolean> {
  const member = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, userId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    )
    .limit(1);

  return member[0]?.role === 'owner' || member[0]?.role === 'admin';
}

/**
 * Check of gebruiker lid is van een organisatie
 */
export async function isOrganizationMember(
  userId: string,
  organizationId: number
): Promise<boolean> {
  const member = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, userId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    )
    .limit(1);

  return member.length > 0 && member[0].status === 'active';
}

/**
 * Haal de rol van een gebruiker binnen een organisatie op
 */
export async function getUserOrganizationRole(
  userId: string,
  organizationId: number
): Promise<OrganizationRole | null> {
  const member = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, userId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    )
    .limit(1);

  return member[0]?.role as OrganizationRole || null;
}

/**
 * Haal alle organisaties van een gebruiker op met hun rollen
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
      status: organizationMembersTable.status,
      organizationName: organizationsTable.name,
      organizationSlug: organizationsTable.slug,
      organizationStatus: organizationsTable.status,
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationMembersTable.organizationId, organizationsTable.id)
    )
    .where(eq(organizationMembersTable.clerkUserId, userId));

  return memberships.filter(m => m.status === 'active' && m.organizationStatus === 'active');
}

// ============================================
// USER MANAGEMENT VIA CLERK
// ============================================

/**
 * Haal alle gebruikers op via Clerk met hun rollen
 */
export async function getAllUsers(): Promise<UserWithRole[]> {
  const client = await clerkClient();

  // Haal alle Clerk gebruikers op (max 500)
  const { data: clerkUsers, totalCount } = await client.users.getUserList({
    limit: 500,
  });

  // Haal alle rollen uit database
  const roles = await db.select().from(userRolesTable);
  const roleMap = new Map(roles.map(r => [r.clerkUserId, r.role as GlobalRole]));

  // Haal alle organisatie memberships op
  const memberships = await db
    .select({
      clerkUserId: organizationMembersTable.clerkUserId,
      organizationId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
      organizationName: organizationsTable.name,
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationMembersTable.organizationId, organizationsTable.id)
    )
    .where(eq(organizationMembersTable.status, 'active'));

  // Groepeer memberships per gebruiker
  const membershipMap = new Map<string, Array<{ id: number; name: string; role: OrganizationRole }>>();
  memberships.forEach(m => {
    if (!membershipMap.has(m.clerkUserId)) {
      membershipMap.set(m.clerkUserId, []);
    }
    membershipMap.get(m.clerkUserId)!.push({
      id: m.organizationId,
      name: m.organizationName,
      role: m.role as OrganizationRole,
    });
  });

  // Combineer data
  return clerkUsers.map(user => ({
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    globalRole: roleMap.get(user.id) || 'user',
    banned: user.banned || false,
    organizations: membershipMap.get(user.id) || [],
  }));
}

/**
 * Update de globale rol van een gebruiker
 */
export async function updateUserGlobalRole(
  targetUserId: string,
  newRole: GlobalRole
): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId || !(await isAdmin())) {
    throw new Error('Unauthorized: alleen admins kunnen rollen updaten');
  }

  // Super admins kunnen alleen door andere super admins worden gewijzigd
  const targetRole = await getUserGlobalRole(targetUserId);
  if (targetRole === 'super_admin' && !(await isSuperAdmin())) {
    throw new Error('Unauthorized: alleen super admins kunnen super admin rollen wijzigen');
  }

  const existing = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, targetUserId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userRolesTable).values({
      clerkUserId: targetUserId,
      role: newRole,
      assignedBy: adminUserId,
    });
  } else {
    await db
      .update(userRolesTable)
      .set({
        role: newRole,
        assignedBy: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(userRolesTable.clerkUserId, targetUserId));
  }
}

/**
 * Update de rol van een gebruiker binnen een organisatie
 */
export async function updateUserOrganizationRole(
  targetUserId: string,
  organizationId: number,
  newRole: OrganizationRole
): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId) {
    throw new Error('Unauthorized: niet ingelogd');
  }

  // Check of admin rechten heeft (globaal admin of org admin)
  const isGlobalAdmin = await isAdmin();
  const isOrgAdmin = await isOrganizationAdmin(adminUserId, organizationId);

  if (!isGlobalAdmin && !isOrgAdmin) {
    throw new Error('Unauthorized: geen rechten om rollen te wijzigen in deze organisatie');
  }

  // Update de rol
  await db
    .update(organizationMembersTable)
    .set({
      role: newRole,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, targetUserId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    );
}

/**
 * Voeg een gebruiker toe aan een organisatie
 */
export async function addUserToOrganization(
  targetUserId: string,
  organizationId: number,
  role: OrganizationRole = 'member'
): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId) {
    throw new Error('Unauthorized: niet ingelogd');
  }

  // Check of admin rechten heeft
  const isGlobalAdmin = await isAdmin();
  const isOrgAdmin = await isOrganizationAdmin(adminUserId, organizationId);

  if (!isGlobalAdmin && !isOrgAdmin) {
    throw new Error('Unauthorized: geen rechten om leden toe te voegen aan deze organisatie');
  }

  // Check of gebruiker al lid is
  const existing = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, targetUserId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Gebruiker is al lid van deze organisatie');
  }

  // Voeg gebruiker toe
  await db.insert(organizationMembersTable).values({
    clerkUserId: targetUserId,
    organizationId,
    role,
    invitedBy: adminUserId,
    status: 'active',
  });
}

/**
 * Verwijder een gebruiker uit een organisatie
 */
export async function removeUserFromOrganization(
  targetUserId: string,
  organizationId: number
): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId) {
    throw new Error('Unauthorized: niet ingelogd');
  }

  // Check of admin rechten heeft
  const isGlobalAdmin = await isAdmin();
  const isOrgAdmin = await isOrganizationAdmin(adminUserId, organizationId);

  if (!isGlobalAdmin && !isOrgAdmin) {
    throw new Error('Unauthorized: geen rechten om leden te verwijderen uit deze organisatie');
  }

  // Verwijder gebruiker
  await db
    .delete(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.clerkUserId, targetUserId),
        eq(organizationMembersTable.organizationId, organizationId)
      )
    );
}

/**
 * Blokkeer een gebruiker (ban via Clerk)
 */
export async function banUser(userId: string): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId || !(await isAdmin())) {
    throw new Error('Unauthorized: alleen admins kunnen gebruikers blokkeren');
  }

  // Super admins kunnen alleen door andere super admins worden geblokkeerd
  const targetRole = await getUserGlobalRole(userId);
  if (targetRole === 'super_admin' && !(await isSuperAdmin())) {
    throw new Error('Unauthorized: alleen super admins kunnen super admin gebruikers blokkeren');
  }

  const client = await clerkClient();
  await client.users.banUser(userId);
}

/**
 * Deblokkeer een gebruiker (unban via Clerk)
 */
export async function unbanUser(userId: string): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId || !(await isAdmin())) {
    throw new Error('Unauthorized: alleen admins kunnen gebruikers deblokkeren');
  }

  const client = await clerkClient();
  await client.users.unbanUser(userId);
}

/**
 * Verwijder een gebruiker permanent (delete via Clerk)
 */
export async function deleteUser(userId: string): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId || !(await isAdmin())) {
    throw new Error('Unauthorized: alleen admins kunnen gebruikers verwijderen');
  }

  // Super admins kunnen alleen door andere super admins worden verwijderd
  const targetRole = await getUserGlobalRole(userId);
  if (targetRole === 'super_admin' && !(await isSuperAdmin())) {
    throw new Error('Unauthorized: alleen super admins kunnen super admin gebruikers verwijderen');
  }

  // Verwijder eerst alle database records van deze gebruiker
  await db.delete(userRolesTable).where(eq(userRolesTable.clerkUserId, userId));
  await db.delete(organizationMembersTable).where(eq(organizationMembersTable.clerkUserId, userId));
  await db.delete(userPreferencesTable).where(eq(userPreferencesTable.clerkUserId, userId));

  // Verwijder daarna de gebruiker uit Clerk
  const client = await clerkClient();
  await client.users.deleteUser(userId);
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check of gebruiker toegang heeft tot een resource binnen een organisatie
 */
export async function canAccessOrganizationResource(
  userId: string,
  organizationId: number,
  requiredRole: OrganizationRole[] = ['member']
): Promise<boolean> {
  // Globale admins hebben altijd toegang
  if (await isAdmin()) {
    return true;
  }

  // Check organisatie membership en rol
  const userRole = await getUserOrganizationRole(userId, organizationId);
  if (!userRole) return false;

  return requiredRole.includes(userRole);
}

/**
 * Haal alle organisatie IDs op waar een gebruiker lid van is
 * Retourneert lege array als gebruiker admin/super_admin is (zij zien alles)
 */
export async function getUserOrganizationIds(userId: string): Promise<number[]> {
  // Admins en super admins zien alles - retourneer lege array
  if (await isAdmin()) {
    return [];
  }

  const organizations = await getUserOrganizations(userId);
  const orgIds = organizations.map(org => org.organizationId);
  
  // Log voor debugging (kan later verwijderd worden)
  if (orgIds.length === 0) {
    console.log(`[DEBUG] User ${userId} heeft geen organisaties. Alle data wordt gefilterd.`);
  } else {
    console.log(`[DEBUG] User ${userId} heeft toegang tot organisaties:`, orgIds);
  }
  
  return orgIds;
}

/**
 * Check of een gebruiker een admin of super_admin is
 * Gebruik dit om te bepalen of filtering nodig is
 */
export async function shouldFilterByOrganization(userId: string): Promise<boolean> {
  return !(await isAdmin());
}

// ============================================
// MODULE PERMISSIONS
// ============================================

/**
 * Check of een gebruiker toegang heeft tot een specifieke module
 * Admins hebben standaard toegang tot alle modules
 */
export async function hasModuleAccess(userId: string, module: ModuleType): Promise<boolean> {
  // Admins hebben altijd toegang
  const userRole = await getUserGlobalRole(userId);
  if (userRole === 'super_admin' || userRole === 'admin') {
    return true;
  }

  // Check module rechten in database
  const permission = await db
    .select()
    .from(userModulePermissionsTable)
    .where(
      and(
        eq(userModulePermissionsTable.clerkUserId, userId),
        eq(userModulePermissionsTable.module, module)
      )
    )
    .limit(1);

  // Als er geen record is, heeft de gebruiker standaard geen toegang
  // Als er een record is, gebruik de granted boolean
  return permission[0]?.granted === true;
}

/**
 * Haal alle module rechten van een gebruiker op
 */
export async function getUserModulePermissions(userId: string): Promise<Record<ModuleType, boolean>> {
  // Admins hebben altijd toegang tot alle modules
  const userRole = await getUserGlobalRole(userId);
  if (userRole === 'super_admin' || userRole === 'admin') {
    return {
      'ai-safety': true,
      'ai-schouw': true,
      'ai-toezicht': true,
    };
  }

  // Haal alle module rechten op
  const permissions = await db
    .select()
    .from(userModulePermissionsTable)
    .where(eq(userModulePermissionsTable.clerkUserId, userId));

  // Maak een map van module -> granted
  const permissionMap = new Map<ModuleType, boolean>();
  permissions.forEach(p => {
    permissionMap.set(p.module as ModuleType, p.granted === true);
  });

  // Retourneer alle modules met hun toegang status (default: false)
  return {
    'ai-safety': permissionMap.get('ai-safety') ?? false,
    'ai-schouw': permissionMap.get('ai-schouw') ?? false,
    'ai-toezicht': permissionMap.get('ai-toezicht') ?? false,
  };
}

/**
 * Geef of verwijder module toegang voor een gebruiker
 */
export async function setModulePermission(
  userId: string,
  module: ModuleType,
  granted: boolean,
  notes?: string
): Promise<void> {
  const { userId: adminUserId } = await auth();
  if (!adminUserId || !(await isAdmin())) {
    throw new Error('Unauthorized: alleen admins kunnen module rechten wijzigen');
  }

  // Check of er al een record bestaat
  const existing = await db
    .select()
    .from(userModulePermissionsTable)
    .where(
      and(
        eq(userModulePermissionsTable.clerkUserId, userId),
        eq(userModulePermissionsTable.module, module)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    // Maak nieuwe record
    await db.insert(userModulePermissionsTable).values({
      clerkUserId: userId,
      module,
      granted,
      grantedBy: adminUserId,
      notes: notes || null,
    });
  } else {
    // Update bestaande record
    await db
      .update(userModulePermissionsTable)
      .set({
        granted,
        grantedBy: adminUserId,
        notes: notes || existing[0].notes || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userModulePermissionsTable.clerkUserId, userId),
          eq(userModulePermissionsTable.module, module)
        )
      );
  }
}

/**
 * Haal alle module rechten van alle gebruikers op (voor admin pagina)
 */
export async function getAllUsersModulePermissions(): Promise<Record<string, Record<ModuleType, boolean>>> {
  const permissions = await db
    .select()
    .from(userModulePermissionsTable);

  // Groepeer per gebruiker
  const userPermissionsMap = new Map<string, Record<ModuleType, boolean>>();

  permissions.forEach(p => {
    if (!userPermissionsMap.has(p.clerkUserId)) {
      userPermissionsMap.set(p.clerkUserId, {
        'ai-safety': false,
        'ai-schouw': false,
        'ai-toezicht': false,
      });
    }
    const userPerms = userPermissionsMap.get(p.clerkUserId)!;
    userPerms[p.module as ModuleType] = p.granted === true;
  });

  // Convert map naar object
  const result: Record<string, Record<ModuleType, boolean>> = {};
  userPermissionsMap.forEach((perms, userId) => {
    result[userId] = perms;
  });

  return result;
}

