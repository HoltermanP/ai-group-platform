# Database Setup Guide

## 📦 Stack

- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Authenticatie**: Clerk (handled externally)

## 💡 Architectuur

Deze applicatie gebruikt **Clerk als single source of truth** voor gebruikersdata. De database bevat alleen applicatie-specifieke data zoals:
- User preferences (theme, language, notifications)
- Projects en andere business data
- Relaties tussen data

**User data (naam, email, avatar, etc.) komt altijd van Clerk API.**

## 🔧 Environment Variables

Zorg ervoor dat je `.env.local` bestand deze variabelen bevat:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## 🚀 Database Commands

```bash
# Genereer migrations op basis van schema wijzigingen
npm run db:generate

# Push schema direct naar database (zonder migrations)
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## 📋 Initial Setup

### 1. Push het schema naar de database

```bash
npm run db:push
```

Dit creëert de tabellen:
- `user_preferences` - Gebruikersvoorkeuren (theme, language, etc.)
- `projects` - Voorbeeld van applicatie data


## 📊 Database Schema

### User Preferences Table

Slaat applicatie-specifieke voorkeuren op per Clerk user.

```typescript
{
  id: integer (auto-increment)
  clerkUserId: string (unique) // Clerk User ID
  theme: string (default: 'theme-slate')
  language: string (default: 'nl')
  emailNotifications: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Projects Table (voorbeeld)

Voorbeeld van applicatie data gekoppeld aan Clerk users.

```typescript
{
  id: integer (auto-increment)
  clerkUserId: string // Eigenaar van project
  name: string
  description: text (nullable)
  status: string (default: 'active')
  createdAt: timestamp
  updatedAt: timestamp
}
```

## 🔌 API Routes

### GET /api/users/preferences

Haalt user info van Clerk + preferences uit database.

**Authenticatie**: Vereist

**Response**:
```json
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "imageUrl": "https://..."
  },
  "preferences": {
    "id": 1,
    "clerkUserId": "user_xxx",
    "theme": "theme-slate",
    "language": "nl",
    "emailNotifications": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/users/preferences

Update of creëer user preferences.

**Authenticatie**: Vereist

**Body**:
```json
{
  "theme": "theme-ocean",
  "language": "en",
  "emailNotifications": false
}
```

## 💡 Gebruik in je code

### Server Component - User data van Clerk

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';

export default async function MyPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  return <div>Welcome {user?.firstName}!</div>;
}
```

### Server Component - Met database preferences

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userPreferencesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function MyPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  // Haal preferences uit database
  const preferences = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.clerkUserId, userId!))
    .limit(1);
  
  return (
    <div>
      Welcome {user?.firstName}!
      Your theme: {preferences[0]?.theme || 'default'}
    </div>
  );
}
```

### API Route - Projects voor huidige user

```typescript
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projectsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.clerkUserId, userId));
  
  return Response.json(projects);
}
```

## 🔄 Database Migrations

Als je het schema wijzigt:

```bash
# 1. Genereer migration
npm run db:generate

# 2. Review de migration in de drizzle/ folder

# 3. Run de migration
npm run db:migrate
```

Of gebruik direct push (zonder migration files):

```bash
npm run db:push
```

## 🛠️ Drizzle Studio

Open een visuele interface voor je database:

```bash
npm run db:studio
```

Navigeer naar `https://local.drizzle.studio` om je database te bekijken en bewerken.

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Neon Docs](https://neon.tech/docs)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks)

