/**
 * WhatsApp bericht service via Twilio
 * Werkt alleen als Twilio credentials zijn geconfigureerd
 */

interface WhatsAppMessage {
  to: string; // Telefoonnummer in E.164 formaat (bijv. +31612345678)
  message: string;
}

/**
 * Check of Twilio WhatsApp is geconfigureerd
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );
}

/**
 * Verstuur een WhatsApp bericht via Twilio
 * Werkt alleen als Twilio credentials zijn geconfigureerd
 */
export async function sendWhatsAppMessage({ to, message }: WhatsAppMessage): Promise<boolean> {
  try {
    // Check of Twilio is geconfigureerd
    if (!isWhatsAppConfigured()) {
      console.log('Twilio WhatsApp niet geconfigureerd. WhatsApp bericht wordt overgeslagen.');
      return false;
    }

    // Dynamisch importeren van Twilio (optioneel dependency)
    let twilio;
    try {
      twilio = require('twilio');
    } catch (error) {
      console.warn('Twilio package niet geïnstalleerd. Installeer met: npm install twilio');
      return false;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Zorg dat het telefoonnummer in het juiste formaat is
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!whatsappNumber) {
      console.error('TWILIO_WHATSAPP_NUMBER is niet geconfigureerd');
      return false;
    }
    const formattedFrom = whatsappNumber.startsWith('whatsapp:')
      ? whatsappNumber
      : `whatsapp:${whatsappNumber}`;

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message,
    });

    console.log('WhatsApp bericht verstuurd:', result.sid);
    return true;
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    // Log specifieke Twilio errors
    if (error.code) {
      console.error(`Twilio error code: ${error.code}, message: ${error.message}`);
    }
    return false;
  }
}

/**
 * Genereer WhatsApp bericht tekst voor kritieke incidenten
 */
export function generateCriticalIncidentWhatsAppMessage(incident: {
  title: string;
  location: string | null;
  incidentId: string;
  incidentUrl: string;
}): string {
  return `🚨 ERNSTIG INCIDENT GEMELD 🚨

Er is een ernstig incident voorgevallen:

${incident.title}

Incident ID: ${incident.incidentId}
${incident.location ? `Locatie: ${incident.location}` : ''}

Bekijk details in de app:
${incident.incidentUrl}

---
AI Group Platform`;
}

