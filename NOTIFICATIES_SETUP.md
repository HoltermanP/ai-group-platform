# Notificaties Setup voor Kritieke Incidenten

Deze applicatie stuurt automatisch notificaties wanneer er een ernstig incident (severity = "critical") wordt ingediend.

## Functionaliteit

- **Email notificaties**: Automatisch verstuurd naar alle geconfigureerde ontvangers
- **WhatsApp notificaties**: Optioneel via Twilio (alleen actief als geconfigureerd)
- **In-app notificaties**: Notificaties verschijnen in de app voor alle ontvangers

## Database Setup

Voer eerst de database migratie uit om de nieuwe tabellen aan te maken:

```bash
npm run db:push
```

Dit creëert de volgende tabellen:
- `critical_incident_recipients` - Gebruikers die notificaties ontvangen
- `notifications` - Notificaties in de app

## Email Configuratie (Verplicht)

Voeg de volgende environment variables toe aan `.env.local`:

```bash
# SMTP Configuratie voor Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Gmail Setup

1. Ga naar je Google Account instellingen
2. Schakel "2-Step Verification" in
3. Genereer een "App Password" voor deze applicatie
4. Gebruik dit app password als `SMTP_PASSWORD`

### Andere SMTP Providers

De applicatie werkt met elke SMTP provider. Pas de `SMTP_HOST` en `SMTP_PORT` aan:
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **Outlook**: `smtp-mail.outlook.com:587`

## WhatsApp Configuratie (Optioneel)

WhatsApp notificaties worden alleen verstuurd als Twilio is geconfigureerd. Als Twilio niet is geconfigureerd, worden alleen email notificaties verstuurd.

### Twilio Setup

1. Maak een account aan op [Twilio](https://www.twilio.com/)
2. Verkrijg een WhatsApp Sandbox nummer (gratis voor testen)
3. Voeg de volgende environment variables toe:

```bash
# Twilio WhatsApp (Optioneel)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Let op**: Voor productie gebruik heb je een betaald Twilio account nodig met een goedgekeurd WhatsApp Business nummer.

## App URL Configuratie

Zorg ervoor dat `NEXT_PUBLIC_APP_URL` is ingesteld voor correcte links in notificaties:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Of laat het leeg - de applicatie probeert automatisch `VERCEL_URL` te gebruiken.

## Gebruik

### Ontvangers Beheren

1. Ga naar `/dashboard/admin/critical-incidents/recipients`
2. Klik op "Ontvanger Toevoegen"
3. Selecteer een gebruiker
4. (Optioneel) Voeg een WhatsApp telefoonnummer toe in E.164 formaat (bijv. +31612345678)
5. Schakel notificaties in/uit met de switch
6. Klik op "Opslaan"

### Notificaties Ontvangen

Wanneer een incident wordt ingediend met severity "critical":
1. Alle geconfigureerde ontvangers ontvangen automatisch een email
2. Ontvangers met een WhatsApp nummer ontvangen ook een WhatsApp bericht (als Twilio is geconfigureerd)
3. Een notificatie verschijnt in de app voor alle ontvangers

### Notificaties Bekijken

Notificaties kunnen worden opgehaald via de API:
- `GET /api/notifications` - Haal alle notificaties op
- `GET /api/notifications?unreadOnly=true` - Alleen ongelezen notificaties
- `PUT /api/notifications` - Markeer notificatie(s) als gelezen

## Dependencies Installeren

Installeer de benodigde packages:

```bash
npm install nodemailer twilio
npm install --save-dev @types/nodemailer
```

## Testen

1. Configureer email en (optioneel) WhatsApp
2. Voeg een ontvanger toe via de admin pagina
3. Maak een test incident aan met severity "critical"
4. Controleer of de notificaties worden verstuurd

## Troubleshooting

### Email wordt niet verstuurd
- Controleer of alle SMTP variabelen correct zijn ingesteld
- Controleer of de SMTP credentials geldig zijn
- Check de server logs voor foutmeldingen

### WhatsApp wordt niet verstuurd
- Controleer of Twilio credentials zijn ingesteld
- Controleer of het telefoonnummer in E.164 formaat is (+31612345678)
- Voor productie: zorg dat je een goedgekeurd WhatsApp Business nummer hebt

### Notificaties verschijnen niet in de app
- Controleer of de gebruiker is toegevoegd als ontvanger
- Controleer of `enabled` is ingesteld op `true`
- Check de database of de notificatie is aangemaakt

