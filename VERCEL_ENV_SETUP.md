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

