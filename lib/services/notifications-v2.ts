import { db } from "@/lib/db";
import { notificationRulesTable, notificationsTable, projectMembersTable, organizationMembersTable, criticalIncidentRecipientsTable } from "@/lib/db/schema";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { sendWhatsAppMessage, generateCriticalIncidentWhatsAppMessage, isWhatsAppConfigured } from "./whatsapp";
import { sendEmail, generateCriticalIncidentEmail } from "./email";
import { clerkClient } from "@clerk/nextjs/server";

interface IncidentData {
  id: number; // Database ID
  incidentId: string; // Uniek incident ID (bijv. VM-2024-001)
  title: string;
  description: string;
  category: string;
  severity: string;
  discipline: string | null;
  location: string | null;
  organizationId: number | null;
  projectId: number | null;
}

interface NotificationFilter {
  severity?: string[];
  category?: string[];
  discipline?: string[];
  organizationId?: number;
  projectId?: number;
}

/**
 * Check of een incident voldoet aan de filter criteria
 */
function matchesFilter(incident: IncidentData, filter: NotificationFilter): boolean {
  // Check severity
  if (filter.severity && filter.severity.length > 0) {
    if (!filter.severity.includes(incident.severity)) {
      return false;
    }
  }

  // Check category
  if (filter.category && filter.category.length > 0) {
    if (!filter.category.includes(incident.category)) {
      return false;
    }
  }

  // Check discipline
  if (filter.discipline && filter.discipline.length > 0) {
    if (!incident.discipline || !filter.discipline.includes(incident.discipline)) {
      return false;
    }
  }

  // Check organizationId
  if (filter.organizationId !== undefined) {
    if (incident.organizationId !== filter.organizationId) {
      return false;
    }
  }

  // Check projectId
  if (filter.projectId !== undefined) {
    if (incident.projectId !== filter.projectId) {
      return false;
    }
  }

  return true;
}

/**
 * Haal phone number op voor een gebruiker (uit criticalIncidentRecipientsTable of Clerk)
 */
async function getUserPhoneNumber(clerkUserId: string): Promise<string | null> {
  try {
    // Eerst checken in criticalIncidentRecipientsTable (backward compatibility)
    const recipient = await db
      .select()
      .from(criticalIncidentRecipientsTable)
      .where(eq(criticalIncidentRecipientsTable.clerkUserId, clerkUserId))
      .limit(1);

    if (recipient.length > 0 && recipient[0].phoneNumber) {
      return recipient[0].phoneNumber;
    }

    // Anders proberen uit Clerk (als beschikbaar)
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(clerkUserId);
      const phoneNumber = user.phoneNumbers[0]?.phoneNumber;
      
      return phoneNumber || null;
    } catch (error) {
      // Clerk heeft mogelijk geen phone number
      return null;
    }
  } catch (error) {
    console.error(`Error fetching phone number for ${clerkUserId}:`, error);
    return null;
  }
}

/**
 * Haal alle ontvangers op voor een notification rule
 */
async function getRecipientsForRule(rule: {
  recipientType: string;
  recipientId: string;
  organizationId: number | null;
}): Promise<Array<{ clerkUserId: string; email: string | null; phoneNumber: string | null }>> {
  const clerk = await clerkClient();
  const recipients: Array<{ clerkUserId: string; email: string | null; phoneNumber: string | null }> = [];

  try {
    if (rule.recipientType === 'user') {
      // Directe gebruiker
      const user = await clerk.users.getUser(rule.recipientId);
      const phoneNumber = await getUserPhoneNumber(rule.recipientId);
      recipients.push({
        clerkUserId: rule.recipientId,
        email: user.emailAddresses[0]?.emailAddress || null,
        phoneNumber,
      });
    } else if (rule.recipientType === 'team') {
      // Team = alle project members
      const projectId = parseInt(rule.recipientId);
      if (!isNaN(projectId)) {
        const teamMembers = await db
          .select()
          .from(projectMembersTable)
          .where(eq(projectMembersTable.projectId, projectId));

        // Haal gebruikersdata op via Clerk
        for (const member of teamMembers) {
          try {
            const user = await clerk.users.getUser(member.clerkUserId);
            const phoneNumber = await getUserPhoneNumber(member.clerkUserId);
            recipients.push({
              clerkUserId: member.clerkUserId,
              email: user.emailAddresses[0]?.emailAddress || null,
              phoneNumber,
            });
          } catch (error) {
            console.error(`Error fetching team member ${member.clerkUserId}:`, error);
          }
        }
      }
    } else if (rule.recipientType === 'organization') {
      // Organisatie = alle organization members
      const organizationId = parseInt(rule.recipientId);
      if (!isNaN(organizationId)) {
        const orgMembers = await db
          .select()
          .from(organizationMembersTable)
          .where(
            and(
              eq(organizationMembersTable.organizationId, organizationId),
              eq(organizationMembersTable.status, 'active')
            )
          );

        // Haal gebruikersdata op via Clerk
        for (const member of orgMembers) {
          try {
            const user = await clerk.users.getUser(member.clerkUserId);
            const phoneNumber = await getUserPhoneNumber(member.clerkUserId);
            recipients.push({
              clerkUserId: member.clerkUserId,
              email: user.emailAddresses[0]?.emailAddress || null,
              phoneNumber,
            });
          } catch (error) {
            console.error(`Error fetching org member ${member.clerkUserId}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error getting recipients for rule ${rule.recipientType}:${rule.recipientId}:`, error);
  }

  return recipients;
}

/**
 * Notificeer op basis van notification rules
 * Dit is de nieuwe flexibele notificatie service
 */
export async function notifyIncident(incident: IncidentData) {
  try {
    console.log('🔔 === NOTIFICATIE SERVICE V2 GESTART ===');
    console.log('🔔 Incident ID:', incident.id);
    console.log('🔔 Titel:', incident.title);
    console.log('🔔 Severity:', incident.severity);
    console.log('🔔 Category:', incident.category);
    console.log('🔔 Organization ID:', incident.organizationId);
    
    // Haal alle actieve notification rules op
    const allRules = await db
      .select()
      .from(notificationRulesTable)
      .where(eq(notificationRulesTable.enabled, true));

    console.log(`🔔 Gevonden ${allRules.length} actieve notification rule(s)`);

    if (allRules.length === 0) {
      console.warn('⚠️ Geen notification rules geconfigureerd');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const incidentUrl = `${baseUrl}/dashboard/ai-safety/${incident.id}`;

    // Check welke rules matchen met dit incident
    const matchingRules = [];
    for (const rule of allRules) {
      try {
        const filters: NotificationFilter = JSON.parse(rule.filters);
        
        // Check organisatie scope (als regel een organizationId heeft, moet incident ook die organizationId hebben)
        if (rule.organizationId !== null) {
          if (incident.organizationId !== rule.organizationId) {
            continue; // Skip deze regel
          }
        }

        if (matchesFilter(incident, filters)) {
          matchingRules.push(rule);
          console.log(`✅ Regel "${rule.name}" matcht met incident`);
        }
      } catch (error) {
        console.error(`Error parsing filters for rule ${rule.id}:`, error);
      }
    }

    console.log(`🔔 ${matchingRules.length} regel(s) matchen met dit incident`);

    if (matchingRules.length === 0) {
      console.log('ℹ️ Geen matching rules gevonden voor dit incident');
      return;
    }

    // Verzamel alle unieke ontvangers (om dubbele notificaties te voorkomen)
    const recipientMap = new Map<string, {
      clerkUserId: string;
      email: string | null;
      phoneNumber: string | null;
      channels: Set<string>;
    }>();

    // Voor elke matching rule, haal ontvangers op
    for (const rule of matchingRules) {
      try {
        const channels: string[] = JSON.parse(rule.channels);
        const recipients = await getRecipientsForRule({
          recipientType: rule.recipientType,
          recipientId: rule.recipientId,
          organizationId: rule.organizationId,
        });

        for (const recipient of recipients) {
          const key = recipient.clerkUserId;
          if (!recipientMap.has(key)) {
            recipientMap.set(key, {
              ...recipient,
              channels: new Set(),
            });
          }
          // Voeg kanalen toe
          channels.forEach(channel => recipientMap.get(key)!.channels.add(channel));
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
      }
    }

    console.log(`🔔 Totaal ${recipientMap.size} unieke ontvanger(s)`);

    // Stuur notificaties naar alle ontvangers
    const notificationPromises = Array.from(recipientMap.values()).map(async (recipient) => {
      try {
        const channels = Array.from(recipient.channels);

        // 1. In-app notificatie (altijd als in_app in channels zit)
        if (channels.includes('in_app')) {
          await db.insert(notificationsTable).values({
            clerkUserId: recipient.clerkUserId,
            type: 'incident',
            title: 'Nieuw incident gemeld',
            message: `Er is een incident gemeld: ${incident.title}${incident.location ? ` op locatie: ${incident.location}` : ''}`,
            incidentId: incident.id,
            read: false,
          });
        }

        // 2. Email notificatie
        if (channels.includes('email') && recipient.email) {
          console.log(`📧 Stuur email naar: ${recipient.email}`);
          const emailContent = generateCriticalIncidentEmail({
            title: incident.title,
            location: incident.location,
            incidentId: incident.incidentId,
            incidentUrl,
          });

          const emailSent = await sendEmail({
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
          
          if (emailSent) {
            console.log(`✅ Email succesvol verstuurd naar ${recipient.email}`);
          } else {
            console.error(`❌ Email versturen naar ${recipient.email} is mislukt`);
          }
        }

        // 3. WhatsApp notificatie
        if (channels.includes('whatsapp') && recipient.phoneNumber && isWhatsAppConfigured()) {
          const whatsappMessage = generateCriticalIncidentWhatsAppMessage({
            title: incident.title,
            location: incident.location,
            incidentId: incident.incidentId,
            incidentUrl,
          });

          await sendWhatsAppMessage({
            to: recipient.phoneNumber,
            message: whatsappMessage,
          });
        }
      } catch (error) {
        console.error(`Error notifying recipient ${recipient.clerkUserId}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);

    console.log(`✅ Notificatie proces voltooid voor ${recipientMap.size} ontvanger(s)`);
    console.log('🔔 === NOTIFICATIE SERVICE V2 EINDE ===');
  } catch (error) {
    console.error('❌ Error notifying incident:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
  }
}

/**
 * Legacy functie voor backward compatibility
 * Gebruikt nog steeds de oude critical incident recipients
 */
export async function notifyCriticalIncident(incident: {
  incidentId: number;
  title: string;
  location: string | null;
  incidentDbId: string;
}) {
  // Deze functie wordt nog gebruikt door de oude code
  // We kunnen deze later verwijderen na migratie
  console.log('⚠️ notifyCriticalIncident wordt gebruikt - overweeg migratie naar notifyIncident');
  
  // Voor nu, gebruik de nieuwe service met een basic incident object
  // Dit is een tijdelijke oplossing
  const incidentData: IncidentData = {
    id: incident.incidentId,
    incidentId: incident.incidentDbId,
    title: incident.title,
    description: '',
    category: '',
    severity: 'critical', // Legacy functie is alleen voor critical
    discipline: null,
    location: incident.location,
    organizationId: null,
    projectId: null,
  };

  await notifyIncident(incidentData);
}

