# Vercel Environment Variables Setup

## 🔑 Vereiste Environment Variables

Voor deze applicatie moeten de volgende environment variables worden ingesteld in Vercel:

### 1. OpenAI API Key
```
OPENAI_API_KEY=sk-...
```
**Waar te vinden:** https://platform.openai.com/api-keys

**Waarom nodig:** Voor AI-analyse van veiligheidsincidenten en het genereren van acties.

### 2. Clerk Authentication Keys
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
**Waar te vinden:** https://dashboard.clerk.com

**Waarom nodig:** Voor gebruikersauthenticatie.

### 3. Database Connection
```
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```
Of voor Neon serverless:
```
NEON_DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Waar te vinden:** Je Neon database dashboard

**Waarom nodig:** Voor database connectiviteit.

### 4. Email Notificaties (Verplicht voor notificaties)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=AI Group Platform
```

**Optioneel:**
- `SMTP_FROM_NAME`: Naam die wordt getoond als afzender (default: "AI Group Platform")

**Waar te vinden:** 
- Gmail: Gebruik een App Password (Account → Security → 2-Step Verification → App Passwords)
- Andere providers: Check de SMTP instellingen van je email provider

**Waarom nodig:** Voor het versturen van email notificaties bij kritieke incidenten.

**Voorbeeld configuraties:**
- Gmail: `smtp.gmail.com:587`
- SendGrid: `smtp.sendgrid.net:587`
- Mailgun: `smtp.mailgun.org:587`
- Outlook: `smtp-mail.outlook.com:587`

### 5. WhatsApp Notificaties (Optioneel)
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Waar te vinden:** [Twilio Dashboard](https://console.twilio.com/)

**Waarom nodig:** Voor het versturen van WhatsApp notificaties bij kritieke incidenten. Als deze niet zijn ingesteld, worden alleen email notificaties verstuurd.

**Let op:** Voor productie gebruik heb je een betaald Twilio account nodig met een goedgekeurd WhatsApp Business nummer.

### 6. App URL (Optioneel)
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Waarom nodig:** Voor correcte links in notificaties. Wordt automatisch gedetecteerd op Vercel via `VERCEL_URL`.

## 📝 Hoe toe te voegen in Vercel

1. Ga naar je project in Vercel Dashboard
2. Klik op **Settings** → **Environment Variables**
3. Voeg elke variabele toe:
   - **Name**: `OPENAI_API_KEY` (of andere variabele naam)
   - **Value**: Je API key waarde
   - **Environment**: Selecteer alle (Production, Preview, Development)
4. Klik op **Save**
5. **Herdeploy** je applicatie (Settings → Deployments → Redeploy)

## ⚠️ Belangrijk

- Na het toevoegen van environment variables moet je **herdeployen** voor de wijzigingen effect hebben
- Gebruik geen quotes rondom de waarde
- Zorg dat alle environment variables correct zijn ingesteld voordat je deployt

## 🔍 Verificatie

Na het deployen, controleer of de API key correct is ingesteld door:
1. Een AI analyse uit te voeren op een veiligheidsincident
2. Als er nog steeds een error is, check de Vercel logs (Deployments → View Function Logs)

