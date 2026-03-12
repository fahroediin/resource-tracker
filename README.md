# BA Resource Tracker

Resource tracking dashboard for the Business Analyst division. Built with **Vite**, **Supabase**, and vanilla JavaScript.

## Features

### Core

- **Dashboard** — Team utilization overview, stat cards, active project list with type filters
- **Team Members** — CRUD management with role, status, email, and skill tracking
- **Project Assignments** — Track projects with type/phase/status filters, member allocation percentages, pagination
- **Capacity Planner** — Visualize workload distribution per member with project breakdown
- **Skills Matrix** — Interactive star-rating proficiency matrix (configurable skill list per division)

### Member Self-Service

- **My Projects** — Members update their own allocation % per assigned project
- **Task To-Do** — Per-project checklist for tracking work items, with progress bar and completion indicator. When all tasks are done, a hint prompts the member to set allocation to 0%

### Management (Head/Admin)

- **View Member Tasks** — Head/Admin can view all task to-dos for any member, grouped by project, from the Team Members page
- **Reports & Export** — Export data to CSV with preview:
  - **Team Summary** — All members with role, status, utilization
  - **Project Assignments** — All projects with assigned members and allocation
  - **Capacity Overview** — Per-member capacity with project breakdown
  - **Task Progress** — Task completion status across all members
- **User Management** — Role-based access control, promote/demote users
- **Division Settings** — Configure project phases, statuses, active capacity phases, and skills per division

### Platform

- **Multi-Tenant** — Division-based data isolation with Row Level Security
- **JWT Auth** — Email/password login via Supabase Auth
- **Dark/Light Theme** — Toggle with persistent preference
- **SweetAlert2** — Modern confirmation dialogs and toast notifications
- **Responsive** — Mobile-friendly with collapsible sidebar

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS (ES Modules), CSS, HTML |
| Bundler | Vite |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| UI Alerts | SweetAlert2 |
| Runtime | Bun / Node.js |

## Roles & Permissions

| Feature | `admin` | `head` | `member` |
|---------|---------|--------|----------|
| Dashboard | ✅ | ✅ | ✅ |
| Team Members | ✅ CRUD | ✅ CRUD | 👁️ Read-only |
| Project Assignments | ✅ CRUD | ✅ CRUD | 👁️ Read-only |
| Capacity Planner | ✅ | ✅ | ✅ |
| Skills Matrix | ✅ Edit | ✅ Edit | 👁️ Read-only |
| My Projects | ❌ Hidden | ❌ Hidden | ✅ Self-allocation + Tasks |
| View Member Tasks | ✅ | ✅ | ❌ Hidden |
| Reports & Export | ✅ | ✅ | ❌ Hidden |
| User Management | ✅ Full | 👁️ View only | ❌ Hidden |
| Division Settings | ✅ | ✅ | ❌ Hidden |
| Tenant Management | `superadmin` only | ❌ | ❌ |

New signups default to `member` (read-only). An admin or head must promote the user's role.

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Run `supabase/migration_project_tasks.sql` for the Task To-Do feature
4. Go to **Authentication** → **Providers** → **Email** → disable "Confirm email" (optional)

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
bun install      # or: npm install
bun run dev      # or: npm run dev
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
├── ROADMAP.md                   # Future features roadmap
├── supabase/
│   ├── schema.sql               # 8 tables + RLS + triggers
│   └── migration_project_tasks.sql  # Task To-Do migration
└── src/
    ├── main.js                  # Entry point, auth state, init
    ├── lib/
    │   ├── supabase.js          # Client init
    │   ├── auth.js              # signIn, signUp, signOut, session
    │   ├── store.js             # All Supabase CRUD (members, projects, tasks, skills, settings)
    │   └── ui.js                # SweetAlert2 toast/confirm, modal, nav, role checks
    ├── views/
    │   ├── auth.js              # Login / Register
    │   ├── dashboard.js         # Stats + utilization
    │   ├── members.js           # Team CRUD + View Member Tasks modal
    │   ├── projects.js          # Project + assignments
    │   ├── capacity.js          # Workload cards
    │   ├── skills.js            # Star matrix
    │   ├── users.js             # User management
    │   ├── settings.js          # Division settings
    │   ├── superadmin.js        # Tenant management
    │   ├── myprojects.js        # Member self-allocation + Task To-Do
    │   └── reports.js           # CSV export (4 report types)
    └── styles/
        ├── index.css            # Barrel import
        ├── base.css             # Variables, reset, layout, theme
        ├── sidebar.css          # Sidebar nav
        ├── components.css       # Buttons, cards, tables, modals
        ├── views.css            # Dashboard, capacity, skills, tasks, reports
        └── auth.css             # Login/register page
```

## Database Schema

8 tables with Row Level Security:

| Table | Description |
|-------|-------------|
| `divisions` | Tenants / divisions |
| `division_settings` | Phases, statuses, skills config per division |
| `profiles` | Extends `auth.users` — role, display name, division |
| `members` | BA team members |
| `projects` | Project tracking with type, phase, status, dates |
| `project_assignments` | Member ↔ project allocation (cascade delete) |
| `project_tasks` | Task to-do items per assignment (cascade delete) |
| `member_skills` | Skill proficiency per member (cascade delete) |
| `activity_log` | Audit trail |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned future features.

## License

MIT
