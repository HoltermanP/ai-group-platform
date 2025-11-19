/**
 * Email service voor het versturen van notificaties
 * Gebruikt SMTP voor het versturen van emails
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Verstuur een email via SMTP
 * Werkt met verschillende SMTP providers (Gmail, SendGrid, etc.)
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    // Check of SMTP configuratie aanwezig is
    console.log('=== EMAIL SERVICE DEBUG ===');
    console.log('SMTP_HOST:', process.env.SMTP_HOST ? '✓ Aanwezig' : '✗ Ontbreekt');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || 'Niet ingesteld (gebruikt default 587)');
    console.log('SMTP_USER:', process.env.SMTP_USER ? '✓ Aanwezig' : '✗ Ontbreekt');
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '✓ Aanwezig' : '✗ Ontbreekt');
    console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
    console.log('SMTP_FROM:', process.env.SMTP_FROM || process.env.SMTP_USER || 'Niet ingesteld');
    console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME || 'Niet ingesteld (gebruikt default)');
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('❌ SMTP configuratie niet compleet. Email wordt niet verstuurd.');
      console.error('Ontbrekende variabelen:');
      if (!process.env.SMTP_HOST) console.error('  - SMTP_HOST');
      if (!process.env.SMTP_USER) console.error('  - SMTP_USER');
      if (!process.env.SMTP_PASSWORD) console.error('  - SMTP_PASSWORD');
      return false;
    }

    // Gebruik Node.js built-in modules voor SMTP
    // In productie kan dit vervangen worden door een library zoals nodemailer
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true voor 465, false voor andere ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Format "From" header met naam en email
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'AI Group Platform';
    const fromHeader = `${fromName} <${fromEmail}>`;

    const mailOptions = {
      from: fromHeader,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags voor plain text versie
      // Voeg belangrijke headers toe om spam/archivering te voorkomen
      headers: {
        'X-Priority': '1', // Hoge prioriteit
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
        'X-Mailer': 'AI Group Platform',
      },
      // Reply-to header
      replyTo: fromEmail,
    };

    console.log(`📧 Probeer email te versturen naar: ${to}`);
    console.log(`📧 Van: ${mailOptions.from}`);
    console.log(`📧 Onderwerp: ${subject}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email succesvol verstuurd!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    if (error.response) {
      console.error('   SMTP Response:', error.response);
    }
    return false;
  }
}

/**
 * Genereer HTML email template voor kritieke incidenten
 */
export function generateCriticalIncidentEmail(incident: {
  title: string;
  location: string | null;
  incidentId: string;
  incidentUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `🚨 Ernstig incident gemeld: ${incident.title}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .incident-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
    .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Ernstig Incident Gemeld</h1>
    </div>
    <div class="content">
      <p>Er is een ernstig incident voorgevallen dat uw aandacht vereist.</p>
      
      <div class="incident-details">
        <h2>${incident.title}</h2>
        <p><strong>Incident ID:</strong> ${incident.incidentId}</p>
        ${incident.location ? `<p><strong>Locatie:</strong> ${incident.location}</p>` : ''}
      </div>
      
      <p>Klik op de onderstaande knop om direct naar het incident te gaan en de details te bekijken:</p>
      
      <a href="${incident.incidentUrl}" class="button">Bekijk Incident</a>
      
      <div class="footer">
        <p>Deze email is automatisch gegenereerd door het AI Group Platform.</p>
        <p>Als u deze notificaties niet meer wilt ontvangen, neem dan contact op met uw beheerder.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
🚨 ERNSTIG INCIDENT GEMELD

Er is een ernstig incident voorgevallen dat uw aandacht vereist.

Incident: ${incident.title}
Incident ID: ${incident.incidentId}
${incident.location ? `Locatie: ${incident.location}` : ''}

Bekijk het incident in de app:
${incident.incidentUrl}

---
Deze email is automatisch gegenereerd door het AI Group Platform.
  `;

  return { subject, html, text };
}

