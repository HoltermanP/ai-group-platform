# SMTP Configuratie Checklist

## Vereiste Environment Variables

Zorg dat je `.env.local` bestand de volgende variabelen bevat:

```bash
# SMTP Configuratie (VERPLICHT voor email notificaties)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Belangrijke Punten

1. **Geen quotes**: Gebruik GEEN quotes rondom de waarden
   - ❌ FOUT: `SMTP_HOST="smtp.gmail.com"`
   - ✅ GOED: `SMTP_HOST=smtp.gmail.com`

2. **Geen spaties**: Geen spaties rondom de `=` tekens
   - ❌ FOUT: `SMTP_HOST = smtp.gmail.com`
   - ✅ GOED: `SMTP_HOST=smtp.gmail.com`

3. **SMTP_SECURE**: 
   - `false` voor port 587 (STARTTLS)
   - `true` voor port 465 (SSL)

4. **SMTP_PASSWORD**: Voor Gmail gebruik een App Password, niet je normale wachtwoord

## Voorbeeld Configuraties

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jouw-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM=jouw-email@gmail.com
```

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
SMTP_FROM=noreply@jouwdomein.com
```

### Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jouw-email@bedrijf.com
SMTP_PASSWORD=jouw-wachtwoord
SMTP_FROM=jouw-email@bedrijf.com
```

## Testen

Na het toevoegen van de variabelen:

1. **Herstart de development server** (belangrijk!)
   ```bash
   # Stop de server (Ctrl+C)
   npm run dev
   ```

2. **Maak een kritiek incident aan** via de UI

3. **Check de console logs** - je zou nu uitgebreide debug informatie moeten zien:
   - `=== EMAIL SERVICE DEBUG ===`
   - Welke SMTP variabelen aanwezig zijn
   - Of de email wordt verstuurd
   - Eventuele foutmeldingen

## Veelvoorkomende Problemen

### Geen logs in console
- **Oorzaak**: Server niet herstart na toevoegen van .env.local variabelen
- **Oplossing**: Stop en start de server opnieuw

### "SMTP configuratie niet compleet"
- **Oorzaak**: Een of meer SMTP variabelen ontbreken
- **Oplossing**: Check of alle 6 variabelen aanwezig zijn in .env.local

### "Error sending email" met authentication error
- **Oorzaak**: Verkeerde gebruikersnaam/wachtwoord
- **Oplossing**: 
  - Voor Gmail: gebruik een App Password (niet je normale wachtwoord)
  - Check of 2-Step Verification is ingeschakeld voor Gmail

### Email komt niet aan
- Check spam/junk folder
- Check of SMTP_FROM een geldig email adres is
- Check de console logs voor specifieke foutmeldingen


