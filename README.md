# Personal Finance Tracker

A full-stack, self-hosted personal finance tracking and ledger web application built with **Next.js 16 (App Router)** and **PostgreSQL (raw SQL via `postgres.js`, no ORM)**.

---

## 📌 Executive Q&A (Quick Reference)

| Question | Answer |
| :--- | :--- |
| **Authentication Method** | **Custom JWT + Secure HTTP-only Cookie (`pf_session`)** using `jose` and `@node-rs/argon2` for password hashing. *(No NextAuth, No Supabase Auth library dependency).* |
| **Database Engine & Client** | **PostgreSQL (Compatible with Neon Postgres, Supabase, AWS RDS, Render, Local)**. Queried via **`postgres.js` tagged template literals (No ORM; Drizzle was completely removed)**. |
| **Row-Level Security (RLS)** | Tables have RLS enabled (`ENABLE ROW LEVEL SECURITY`) at the PostgreSQL layer. However, since the Next.js server connects via direct connection string, tenant isolation is explicitly enforced across all SQL queries (`WHERE user_id = $userId`). |
| **Analytics & Charts** | Built with **Recharts**. Includes **Monthly Trends (Income vs Expense vs Investments)**, **Parent Category breakdowns**, **Location expense pie charts**, **Salary vs Employer trends**, **Investment asset allocation & contribution history**, and **Lending/Borrowing delta analysis**. |
| **CSV Import & Export** | **Import:** Robust CLI engine (`bun run db:data`) supporting v1–v5 CSV schemas with investment funding validations and automatic category mapping.<br>**Export:** Both dynamic in-app CSV filter export (`TransactionsView`) and full data export API route (`/api/export/transactions`). |
| **Deployment Target** | Optimized for **Vercel** serverless functions with connection pool tuning (`DATABASE_DISABLE_PREPARE`, pool size limits, edge middleware) or Docker/Node.js environments. |

---

## 🏗 System Architecture & Data Flow

The application is architected around **React Server Components (RSC)**, **Next.js Server Actions**, and **Raw SQL queries** with strict multi-tenant scoping.

```mermaid
flowchart TD
    subgraph Browser ["Client Browser (Next.js 16 Client)"]
        UI[UI Components / Forms / Charts]
        State[Zustand Stores / URL SearchParams]
    end

    subgraph Edge ["Edge / Routing Layer"]
        MW[Next.js Middleware: Session & Route Guard]
    end

    subgraph Server ["Server Environment (Node / Serverless)"]
        RSC[React Server Components]
        SA[Server Actions]
        API[Route Handlers /api/export]
        AuthService[Auth Service: Argon2 + Jose JWT]
        TxService[Ledger & Analytics SQL Services]
        DBClient[postgres.js Connection Pool]
    end

    subgraph Database ["PostgreSQL (Neon / Supabase / Self-Hosted)"]
        PG[(Postgres Database: users, transactions, categories, accounts, rules...)]
    end

    UI -->|Request / Navigation| MW
    MW -->|Authorized| RSC
    MW -->|Unauthorized| UI
    UI -->|Mutations / Actions| SA
    UI -->|CSV Download| API
    RSC --> TxService
    SA --> AuthService
    SA --> TxService
    API --> DBClient
    AuthService --> DBClient
    TxService --> DBClient
    DBClient -->|Parameterized SQL Queries| PG
    PG -->|Result Sets| DBClient
    DBClient --> RSC
    RSC -->|RSC Payload / Streamed HTML| UI
```

---

## 🔐 Authentication & Session Lifecycle

Authentication is built with high-security zero-trust primitives without external third-party authentication services:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant MW as Middleware (Edge)
    participant SA as Server Actions (loginAction / signupAction)
    participant DB as PostgreSQL
    participant Cookie as HTTP-Only Cookie (pf_session)

    Note over User,SA: Signup & Login Flow
    User->>SA: Submit email + password
    SA->>SA: Validate schema via Zod
    SA->>DB: Query user by email
    SA->>SA: Verify Argon2 hash (@node-rs/argon2)
    SA->>SA: Sign JWT (jose: HS256, 7-day TTL, claims: sub, email)
    SA->>Cookie: Set HTTP-only, Secure, SameSite=Lax cookie
    SA-->>User: Redirect to /dashboard

    Note over User,MW: Authenticated Request Flow
    User->>MW: Request protected route (/dashboard, /transactions, /analytics, /settings)
    MW->>Cookie: Extract pf_session token
    MW->>MW: Verify JWT signature & expiration via jose
    alt Invalid / Expired Token
        MW-->>User: Redirect to /login?next=...
    else Valid Token
        MW-->>User: Forward request to React Server Component
    end
```

### Key Security Specifications:
- **Password Hashing**: `@node-rs/argon2` with memory cost `19456`, time cost `2`, parallelism `1`.
- **JWT Signing**: `jose` library using `HS256` signed with `JWT_SECRET`.
- **Session Delivery**: Secure, `httpOnly`, `SameSite: Lax` cookie named `pf_session`.
- **Edge Middleware**: Verifies token validity before hitting any private page route.

---

## 📊 Core Features & Modules

### 1. 🎛 Dashboard & Financial Summary
- **Live Cash Balance**: Real-time computed net liquidity across accounts.
- **Monthly Summary Cards**: Income, expenses, net savings, and savings rate percentage.
- **Recent Transactions Ledger**: Quick view of latest activity with drill-down capabilities.
- **Unsettled Balances Indicator**: Visual alerts for active loans and borrowings.

### 2. 💸 Transaction Engine & Double-Entry Ledger
Supports 8 first-class financial transaction types:
- `EXPENSE`: Daily spending tagged to parent/child categories.
- `INCOME`: Salary, wages, bonuses, freelance earnings.
- `BORROW`: Borrowing from contacts/entities with repayment tracking.
- `REPAYMENT`: Debt settlement reducing borrow balance.
- `LEND`: Lending money to friends or contacts.
- `RECEIVE`: Loan recovery reducing loan balance.
- `INVESTMENT`: Capital allocation into Chit Funds, Mutual Funds, PF, RD, Stocks, etc.
- `ADJUSTMENT`: Reconciliation entries for balance adjustments.
- **Investment-Funded Expense Tracking**: Record expenses funded directly from liquidated investment assets.

### 3. 📈 In-Depth Analytics & Interactive Charts
Powered by `recharts` and optimized SQL aggregation pipelines:
- **Monthly Trends Chart**: Multi-line visualization tracking Income, Expenses, and Investments over time.
- **Category-Wise Expense Breakdown**: Horizontal bar chart sorting spending across parent categories.
- **Location Spending**: Pie chart analyzing geographical expense distribution.
- **Salary & Employer Insights (`/analytics/income/salary`)**: Historical salary progression grouped by employer.
- **Investments Tracker (`/analytics/investments`)**: Asset distribution and monthly contribution trends.
- **Lending & Debt Analytics (`/analytics/lending`)**: Net loan positions per person and repayment timelines.

### 4. ⚡ Automation Rules Engine
- Define custom keyword-based rules (e.g. `rapido` $\rightarrow$ Transport / Local Travel, `salary` $\rightarrow$ Income / Salary).
- Form inputs automatically suggest and autofill categories, locations, and contacts based on keywords matching descriptions/notes.

### 5. 📂 Bulk CSV Import & Data Export
- **CSV Import Script (`bun run db:data`)**:
  - Handles legacy (`v1`–`v3`), standard (`v4`), and investment-funded (`v5`) CSV formats.
  - Validates date formats (`DD-MM-YYYY` or `YYYY-MM-DD`).
  - Resolves hierarchical categories, locations, companies, and contacts automatically.
  - Verifies available investment balance before allowing investment-funded expense imports.
  - Supports dry-run validation (`DATA_IMPORT_DRY_RUN=1`).
- **CSV Data Export**:
  - **In-App Filter Export**: Filter transactions by date range, category, and location, then export matching records as CSV.
  - **Dedicated API Endpoint**: `/api/export/transactions` generates a UTF-8 BOM CSV stream of all transaction logs.

---

## 🗄 Database Schema (ER Diagram)

The application communicates directly with PostgreSQL using clean relational schemas:

```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : owns
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ CONTACTS : owns
    USERS ||--o{ COMPANIES : owns
    USERS ||--o{ LOCATIONS : owns
    USERS ||--o{ RULES : owns
    USERS ||--o{ TRANSACTIONS : owns

    CATEGORIES ||--o{ CATEGORIES : "parent of"
    CATEGORIES ||--o{ TRANSACTIONS : categorizes
    CATEGORIES ||--o{ RULES : targets

    ACCOUNTS ||--o{ TRANSACTIONS : holds
    LOCATIONS ||--o{ TRANSACTIONS : occurs_at
    CONTACTS ||--o{ TRANSACTIONS : involves
    COMPANIES ||--o{ TRANSACTIONS : employer_of

    USERS {
        uuid id PK
        text email UK
        text password_hash
        timestamp created_at
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        text name
    }

    CATEGORIES {
        uuid id PK
        uuid user_id FK
        text name
        uuid parent_id FK
        transaction_type type
        boolean is_selectable
        integer sort_order
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        transaction_type type
        numeric amount
        uuid category_id FK
        uuid parent_category_id FK
        numeric investment_used_amount
        uuid investment_used_category_id FK
        uuid location_id FK
        uuid contact_id FK
        uuid company_id FK
        uuid account_id FK
        text note
        date transaction_date
        time transaction_time
        timestamp created_at
    }

    RULES {
        uuid id PK
        uuid user_id FK
        text keyword
        text note
        uuid category_id FK
        uuid location_id FK
        uuid contact_id FK
    }

    CONTACTS {
        uuid id PK
        uuid user_id FK
        text name
    }

    COMPANIES {
        uuid id PK
        uuid user_id FK
        text name
    }

    LOCATIONS {
        uuid id PK
        uuid user_id FK
        text name
    }
```

---

## 📂 Project Directory Structure

```plaintext
finance-tracker/
├── data/                                # Sample & historical CSV data files
│   └── historical-transactions.csv
├── src/
│   ├── app/                             # Next.js 16 App Router
│   │   ├── (auth)/                      # Authentication route group
│   │   │   ├── login/                   # User sign-in page
│   │   │   └── signup/                  # User registration page
│   │   ├── (main)/                      # Protected application routes
│   │   │   ├── analytics/               # Analytics & reporting views
│   │   │   │   ├── income/salary/       # Salary & employer analytics
│   │   │   │   ├── investments/         # Portfolio & contribution analytics
│   │   │   │   └── lending/             # Loan & borrow tracking
│   │   │   ├── dashboard/               # Main dashboard overview
│   │   │   ├── settings/                # Categories, rules, entities settings
│   │   │   └── transactions/            # Transaction ledger & new entry form
│   │   │       └── new/                 # Quick entry transaction form
│   │   ├── actions/                     # Server Actions (auth, ledger, settings)
│   │   ├── api/                         # API routes (e.g. /api/export/transactions)
│   │   ├── globals.css                  # Tailwind CSS v4 & theme variables
│   │   └── layout.tsx                   # Root HTML & body shell
│   ├── components/                      # Reusable UI component library
│   │   ├── common/                      # Shared layouts, headers, skeletons
│   │   ├── feature-specific/            # Domain components (analytics, auth, transactions)
│   │   └── ui/                          # Design system atoms (buttons, cards, dialogs)
│   ├── lib/                             # Core library & server services
│   │   ├── auth/                        # JWT verification, Argon2, session cookies
│   │   ├── constants/                   # Default categories, entities, rules
│   │   ├── db/                          # Database infrastructure (raw postgres.js)
│   │   │   ├── core/                    # Pool client, connection management
│   │   │   ├── migrations/              # Raw SQL migration scripts (*.sql)
│   │   │   ├── ops/                     # Migration runner, seeder, CSV importer
│   │   │   └── schema/                  # TypeScript interface definitions
│   │   ├── services/                    # Business logic & SQL query aggregates
│   │   ├── store/                       # Zustand client state stores
│   │   └── utilities/                   # Formatters, currency, date helpers
│   └── middleware.ts                    # Edge session guard middleware
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0` or later (or Bun)
- **PostgreSQL**: PostgreSQL 14+ instance (Neon, Supabase, AWS RDS, or local Postgres)
- **Bun** (recommended for running database migration/seed scripts)

### 2. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# PostgreSQL connection string (supports Neon, Supabase poolers, AWS RDS)
DATABASE_URL="postgres://username:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require"

# Random secret key for signing JWT sessions (at least 32 characters)
JWT_SECRET="generate-a-secure-random-jwt-secret-key"

# Optional: Seed configuration for initial admin user
SEED_ADMIN_USER_ID="00000000-0000-0000-0000-000000000001"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="SecureAdminPassword123"

# Optional: Serverless connection pool tuning
DATABASE_POOL_MAX=5
DATABASE_DISABLE_PREPARE=1
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migrations & Seed Data
```bash
# 1. Apply database migrations (executes src/lib/db/migrations/*.sql)
bun run db:migrate

# 2. Seed default categories, rules, locations, and optional admin user
bun run db:seed
```

### 5. (Optional) Import Historical CSV Data
```bash
# Imports data from data/historical-transactions.csv
bun run db:data
```

### 6. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Database & CLI Command Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Next.js development server with hot-reload |
| `npm run build` | Compile Next.js production build |
| `npm run start` | Run Next.js production server |
| `npm run lint` | Run ESLint across `src/` |
| `npm run typecheck` | Run TypeScript type checking without emitting files |
| `bun run db:migrate` | Apply raw SQL migrations idempotently |
| `bun run db:seed` | Seed standard category hierarchy, tags, and admin user |
| `bun run db:data` | Parse and import historical CSV transactions |
| `bun run db:reset` | **(Caution)** Drop all tables/enums and re-run migrations |
| `bun run db:reset:data` | Clear all user transactions and re-import from CSV |
| `bun run db:reset:all` | Drop database, re-migrate, re-seed, and re-import CSV |

---

## 🚢 Deployment Notes (Vercel & Cloud Postgres)

1. **Environment Variables**: Set `DATABASE_URL` and `JWT_SECRET` in your Vercel Project Settings under **Environment Variables**.
2. **Connection Pooling**: When connecting to Neon or Supabase transaction poolers (port `6543`), the database client automatically configures TLS and disables prepared statements (`DATABASE_DISABLE_PREPARE=1`) to prevent connection pool exhaustion.
3. **Password Module Config**: `next.config.ts` includes `serverExternalPackages: ["@node-rs/argon2"]` to bundle the native Argon2 binary for Vercel Serverless Functions.
