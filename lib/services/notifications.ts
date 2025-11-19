import { db } from "@/lib/db";
import { criticalIncidentRecipientsTable, notificationsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage, generateCriticalIncidentWhatsAppMessage, isWhatsAppConfigured } from "./whatsapp";
import { sendEmail, generateCriticalIncidentEmail } from "./email";
import { clerkClient } from "@clerk/nextjs/server";

interface CriticalIncidentData {
  incidentId: number; // Database ID
  title: string;
  location: string | null;
  incidentDbId: string; // Het unieke incident ID (bijv. VM-2024-001)
}

/**
 * Notificeer alle geconfigureerde recipients over een kritiek incident
 * Stuurt zowel email als WhatsApp (als geconfigureerd)
 */
export async function notifyCriticalIncident(incident: CriticalIncidentData) {
  try {
    console.log('🔔 === NOTIFICATIE SERVICE GESTART ===');
    console.log('🔔 Incident ID:', incident.incidentId);
    console.log('🔔 Titel:', incident.title);
    
    // Haal alle ontvangers op die notificaties moeten ontvangen
    const recipients = await db
      .select()
      .from(criticalIncidentRecipientsTable)
      .where(eq(criticalIncidentRecipientsTable.enabled, true));

    console.log(`🔔 Gevonden ${recipients.length} ontvanger(s)`);

    if (recipients.length === 0) {
      console.warn('⚠️ Geen ontvangers geconfigureerd voor kritieke incidenten');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const incidentUrl = `${baseUrl}/dashboard/ai-safety/${incident.incidentId}`;

    // Haal gebruikersdata op via Clerk voor email adressen
    const clerk = await clerkClient();
    const recipientData = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const user = await clerk.users.getUser(recipient.clerkUserId);
          return {
            ...recipient,
            email: user.emailAddresses[0]?.emailAddress || null,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          };
        } catch (error) {
          console.error(`Error fetching user ${recipient.clerkUserId}:`, error);
          return {
            ...recipient,
            email: null,
            firstName: '',
            lastName: '',
          };
        }
      })
    );

    // Stuur notificaties naar alle ontvangers
    const notificationPromises = recipientData.map(async (recipient) => {
      try {
        // 1. Maak notificatie in de app
        await db.insert(notificationsTable).values({
          clerkUserId: recipient.clerkUserId,
          type: 'critical_incident',
          title: 'Ernstig incident gemeld',
          message: `Er is een ernstig incident gemeld: ${incident.title}${incident.location ? ` op locatie: ${incident.location}` : ''}`,
          incidentId: incident.incidentId,
          read: false,
        });

        // 2. Stuur email notificatie
        if (recipient.email) {
          console.log(`📧 Stuur email naar: ${recipient.email}`);
          const emailContent = generateCriticalIncidentEmail({
            title: incident.title,
            location: incident.location,
            incidentId: incident.incidentDbId,
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
        } else {
          console.warn(`⚠️ Geen email adres gevonden voor gebruiker ${recipient.clerkUserId}`);
        }

        // 3. Stuur WhatsApp bericht als telefoonnummer beschikbaar is EN Twilio is geconfigureerd
        if (recipient.phoneNumber && isWhatsAppConfigured()) {
          const whatsappMessage = generateCriticalIncidentWhatsAppMessage({
            title: incident.title,
            location: incident.location,
            incidentId: incident.incidentDbId,
            incidentUrl,
          });

          await sendWhatsAppMessage({
            to: recipient.phoneNumber,
            message: whatsappMessage,
          });
        }
      } catch (error) {
        console.error(`Error notifying recipient ${recipient.clerkUserId}:`, error);
        // Continue met andere recipients ook al faalt deze
      }
    });

    await Promise.allSettled(notificationPromises);

    console.log(`✅ Notificatie proces voltooid voor ${recipients.length} ontvanger(s)`);
    console.log('🔔 === NOTIFICATIE SERVICE EINDE ===');
  } catch (error) {
    console.error('❌ Error notifying critical incident:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    // Gooi error niet door - we willen niet dat het aanmaken van een incident faalt door notificatie problemen
  }
}

