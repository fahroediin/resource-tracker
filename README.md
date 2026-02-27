# BA Resource Tracker

Resource tracking dashboard for the Business Analyst division. Built with **Vite**, **Supabase**, and vanilla JavaScript.

## Features

- **Dashboard** — Team utilization overview, stat cards, active projects
- **Team Members** — CRUD management with role, status, and skill tracking
- **Project Assignments** — Track projects with member allocation percentages
- **Capacity Planner** — Visualize workload distribution per member
- **Skills Matrix** — Interactive star-rating proficiency matrix (10 BA skills)
- **User Management** — Role-based access control (admin/head/member)
- **JWT Auth** — Email/password login via Supabase Auth

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS (ES Modules), CSS, HTML |
| Bundler | Vite |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Runtime | Bun |

## Roles & Permissions

| Role | Data CRUD | Skills Edit | User Management |
|------|-----------|-------------|-----------------|
| `admin` | ✅ Full | ✅ | ✅ Change roles, delete users |
| `head` | ✅ Full | ✅ | 👁️ View only |
| `member` | 👁️ Read-only | 👁️ Read-only | ❌ Hidden |

New signups default to `member` (read-only). An admin or head must promote the user's role.

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Go to **Authentication** → **Providers** → **Email** → disable "Confirm email" (optional)

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Install & Run

```bash
bun install
bun run dev
```

### 4. First Admin

1. Register your first account via the Sign Up form
2. In Supabase Dashboard → **Table Editor** → `profiles` → set your user's `role` to `admin`
3. Refresh the app — you now have full access

## Project Structure

```
ba-resource-tracker/
├── index.html
├── package.json
├── vite.config.js
├── .env
├── supabase/
│   └── schema.sql          # 6 tables + RLS + trigger
└── src/
    ├── main.js              # Entry point, auth state, init
    ├── lib/
    │   ├── supabase.js      # Client init
    │   ├── auth.js          # signIn, signUp, signOut, session
    │   ├── store.js         # All Supabase CRUD + seed data
    │   └── ui.js            # Toast, modal, nav, role checks
    ├── views/
    │   ├── auth.js          # Login / Register
    │   ├── dashboard.js     # Stats + utilization
    │   ├── members.js       # Team CRUD
    │   ├── projects.js      # Project + assignments
    │   ├── capacity.js      # Workload cards
    │   ├── skills.js        # Star matrix
    │   └── users.js         # User management
    └── styles/
        ├── index.css        # Barrel import
        ├── base.css         # Variables, reset, layout
        ├── sidebar.css      # Sidebar nav
        ├── components.css   # Buttons, cards, tables, modals
        ├── views.css        # Dashboard, capacity, skills
        └── auth.css         # Login/register page
```

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Sage Green | `#A2CB8B` | Primary accent |
| Cream | `#FFFBF1` | Text, highlights |
| Navy | `#25343F` | Background, cards |

## Database Schema

6 tables with Row Level Security:

- `profiles` — extends `auth.users`, stores role + display name
- `members` — BA team members
- `projects` — project tracking
- `project_assignments` — member ↔ project allocation (cascade delete)
- `member_skills` — skill proficiency per member (cascade delete)
- `activity_log` — audit trail

## License

MIT
