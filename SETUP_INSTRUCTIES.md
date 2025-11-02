# Setup Instructies - Gebruikers- en Organisatiebeheer

## 🎉 Wat is geïmplementeerd?

Je hebt nu een **volledig gebruikers- en organisatiebeheer systeem** met:

### ✅ Features
- **Globale rollen**: Super Admin, Admin, en Gebruiker
- **Organisaties**: Bedrijven/teams binnen het platform
- **Organisatie-specifieke rollen**: Owner, Admin, Manager, Member, Viewer
- **Rechtenbeheer**: Per gebruiker en per organisatie
- **Admin interfaces**: Voor gebruikers- en organisatiebeheer
- **Clerk integratie**: Alle authenticatie via Clerk

### 📊 Database Structuur
- `organizations` - Organisaties binnen het platform
- `user_roles` - Globale systeemrollen per gebruiker
- `organization_members` - Leden binnen organisaties met rollen
- `user_preferences` - Gebruikersinstellingen (inclusief standaard organisatie)
- Projecten en Safety Incidents zijn gekoppeld aan organisaties

## 🚀 Setup Stappen

### Stap 1: Database Migratie

**Optie A: Automatisch (Aanbevolen)**
```bash
npm run db:push
```

Als dit vragen stelt over de `organizationId` kolom, kies:
- **`+ organizationId create column`** (de eerste optie)

**Optie B: Handmatig via SQL**

Als automatisch niet werkt, voer dan dit uit in je Neon database console:

```sql
-- Kopieer en plak de inhoud van: scripts/setup-admin.sql
```

### Stap 2: Eerste Admin Aanmaken

Er zijn 2 manieren:

#### Methode 1: Via Setup Pagina (Makkelijkst)

1. Start de dev server: `npm run dev`
2. Log in met je account
3. Ga naar: `http://localhost:3000/setup`
4. Vul je eerste organisatie in
5. Klik op "Platform Instellen"

#### Methode 2: Handmatig via Database

1. Log in op je applicatie
2. Ga naar Clerk dashboard → Users → Kopieer je User ID
3. Voer uit in Neon console:

```sql
-- Maak een organisatie aan
INSERT INTO "organizations" (name, slug, description, "createdBy")
VALUES ('AI Group', 'ai-group', 'Hoofd organisatie', 'JOU_CLERK_USER_ID_HIER');

-- Maak jezelf super admin
INSERT INTO "user_roles" ("clerkUserId", role, "assignedBy")
VALUES ('JOUW_CLERK_USER_ID_HIER', 'super_admin', 'JOUW_CLERK_USER_ID_HIER');

-- Voeg jezelf toe aan de organisatie als owner
INSERT INTO "organization_members" ("organizationId", "clerkUserId", role, "invitedBy")
VALUES (1, 'JOUW_CLERK_USER_ID_HIER', 'owner', 'JOUW_CLERK_USER_ID_HIER');
```

### Stap 3: Controleer of het werkt

1. Herstart de dev server
2. Log opnieuw in
3. Je zou nu een "Admin" dropdown moeten zien in de header
4. Ga naar: `/dashboard/admin/users` om gebruikers te beheren
5. Ga naar: `/dashboard/admin/organizations` om organisaties te beheren

## 📖 Gebruik

### Admin Panel Toegang

Als je **super_admin** of **admin** bent, zie je een "Admin" menu in de header met:
- **Gebruikers**: Beheer alle gebruikers en hun globale rollen
- **Organisaties**: Beheer organisaties en hun leden

### Rollen Uitleg

#### Globale Rollen (Platform-breed)
- **Super Admin**: Volledige controle, kan andere admins aanmaken
- **Admin**: Kan gebruikers en organisaties beheren
- **User**: Standaard gebruiker

#### Organisatie Rollen
- **Owner**: Volledige controle over de organisatie
- **Admin**: Kan leden beheren en instellingen wijzigen
- **Manager**: Kan projecten en resources beheren
- **Member**: Standaard lid
- **Viewer**: Alleen lees-toegang

### API Endpoints

#### Gebruikersbeheer
```
GET    /api/admin/users                    - Haal alle gebruikers op
PATCH  /api/admin/users/[id]/role          - Update globale rol
```

#### Organisatiebeheer
```
GET    /api/admin/organizations            - Haal alle organisaties op
POST   /api/admin/organizations            - Maak organisatie aan
GET    /api/admin/organizations/[id]       - Haal organisatie op
PATCH  /api/admin/organizations/[id]       - Update organisatie
DELETE /api/admin/organizations/[id]       - Verwijder organisatie
```

#### Ledenbeheer
```
GET    /api/admin/organizations/[id]/members       - Haal leden op
POST   /api/admin/organizations/[id]/members       - Voeg lid toe
PATCH  /api/admin/organizations/[id]/members       - Update rol
DELETE /api/admin/organizations/[id]/members       - Verwijder lid
```

## 🔧 Helper Functies

In je code kun je deze helper functies gebruiken:

```typescript
import {
  isAdmin,
  isSuperAdmin,
  isOrganizationAdmin,
  isOrganizationMember,
  getUserOrganizations,
  canAccessOrganizationResource,
} from '@/lib/clerk-admin';

// Check admin status
const admin = await isAdmin();

// Check organisatie toegang
const isMember = await isOrganizationMember(userId, orgId);

// Haal organisaties op
const orgs = await getUserOrganizations(userId);
```

## 🎨 UI Componenten

Alle UI is gebouwd met shadcn/ui:
- Badge
- Button
- Card
- Dialog
- Input
- Label
- Select
- Table
- Avatar
- Dropdown Menu

## 🐛 Troubleshooting

### "Geen toegang - alleen voor admins"
- Zorg dat je een `user_roles` record hebt met role `admin` of `super_admin`
- Check je Clerk User ID

### Database errors
- Run `npm run db:push` opnieuw
- Check of alle tabellen zijn aangemaakt in Neon console

### Admin menu niet zichtbaar
- Hard refresh: Cmd+Shift+R (Mac) of Ctrl+Shift+R (Windows)
- Check browser console voor errors
- Verifieer dat je admin rol hebt

## 📝 Volgende Stappen

1. Voeg meer gebruikers toe via Clerk
2. Maak organisaties aan
3. Voeg gebruikers toe aan organisaties
4. Koppel bestaande projecten aan organisaties
5. Pas de project/safety incident forms aan om organizationId te verplichten

## 🎯 Toekomstige Verbeteringen

- [ ] Email uitnodigingen voor organisaties
- [ ] Custom permissies per gebruiker
- [ ] Organisatie instellingen pagina
- [ ] Audit log voor admin acties
- [ ] Bulk gebruikersacties
- [ ] Organisatie statistics dashboard

Succes met je platform! 🚀

