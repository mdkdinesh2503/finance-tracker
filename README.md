# Finance Tracker

Personal finance tracker built with **Next.js App Router** and **PostgreSQL** (no ORM).

## 🎯 Project Overview
This project is a comprehensive, self-hosted personal finance management application. It is designed to give you complete control over your financial data with a fast, modern interface. It allows you to track expenses, income, and investments, all while supporting advanced categorization rules and robust analytics.

## ✨ Features
- **Secure Authentication**: Full user login, registration, and session management.
- **Interactive Dashboard**: A high-level, visual overview of your financial health.
- **Transaction Management**: Log various types of transactions including Expenses, Income, Borrowing, Repayment, Investments, and Adjustments.
- **Multi-Dimensional Categorization**:
  - **Accounts**: Track balances across multiple accounts (e.g., Cash, Bank).
  - **Hierarchical Categories**: Group transactions with parent-child category relationships.
  - **Tags & Metadata**: Link transactions to specific Contacts, Companies, and Locations.
- **Automation Rules Engine**: Define keyword-based rules to automatically assign categories, contacts, and locations to transactions.
- **Analytics & Reporting**: Generate visualizations and charts to analyze spending trends over time.
- **Bulk Data Import**: Easily import historical transactions from CSV files.
- **Row-Level Security (RLS)**: Enforces strict data isolation at the database level to ensure privacy.

## 📐 Architecture & Data Flow

### Application Architecture
The application leverages Next.js App Router for full-stack capabilities, utilizing React Server Components and Server Actions to interact securely with the PostgreSQL database.

```mermaid
graph TD
    Client[Client Browser]
    
    subgraph "Next.js App Router (Server)"
        UI[React Server Components]
        SA[Server Actions / API]
        Services[Business Logic & Services]
        DBClient[Database Driver / postgres]
    end
    
    Database[(PostgreSQL DB)]
    
    Client -- "User Interaction" --> UI
    UI -- "Form Submit / Mutation" --> SA
    SA -- "Process Data" --> Services
    Services -- "SQL Query" --> DBClient
    DBClient -- "Execute & Fetch" --> Database
    Database -- "Result" --> DBClient
    DBClient -- "Data" --> Services
    Services -- "Response" --> SA
    SA -- "Revalidate & Update" --> UI
    UI -- "Rendered HTML / RSC Payload" --> Client
```

### Database Schema (ER Diagram)
The database is designed with strong referential integrity, supporting multi-dimensional transaction tagging and row-level security.

```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : owns
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ TRANSACTIONS : owns
    USERS ||--o{ RULES : owns
    
    TRANSACTIONS }|--|| ACCOUNTS : "belongs to"
    TRANSACTIONS }|--o| CATEGORIES : "categorized by"
    TRANSACTIONS }|--o| LOCATIONS : "occurred at"
    TRANSACTIONS }|--o| CONTACTS : "involved"
    TRANSACTIONS }|--o| COMPANIES : "transacted with"
    
    RULES }|--o| CATEGORIES : "assigns"
    RULES }|--o| LOCATIONS : "assigns"
    
    USERS {
        uuid id PK
        string email
        string password_hash
    }
    TRANSACTIONS {
        uuid id PK
        enum type
        numeric amount
        date transaction_date
    }
    CATEGORIES {
        uuid id PK
        string name
        enum type
        uuid parent_id FK
    }
    ACCOUNTS {
        uuid id PK
        string name
    }
    RULES {
        uuid id PK
        string keyword
    }
```

### User Navigation Flow
```mermaid
flowchart LR
    A[Login / Register] --> B{Authenticated?}
    B -- No --> A
    B -- Yes --> C[Dashboard]
    
    C --> D[Transactions List]
    C --> E[Analytics & Charts]
    C --> F[Settings]
    
    D --> D1[Add/Edit Transaction]
    D --> D2[Bulk Import CSV]
    
    E --> E1[Income/Expense Trends]
    
    F --> F1[Manage Categories]
    F --> F2[Manage Accounts]
    F --> F3[Automation Rules]
```

## 🗂 Project Structure

The project is structured under the `src` directory, following modular and feature-driven patterns:

### `src/app`
Contains the Next.js App Router pages, layouts, and API routes.
- **`(auth)`**: Routes related to user authentication (login, register).
- **`(main)`**: Main application routes (dashboard, transactions, etc.) for authenticated users.
- **`(setup)`**: Setup routes (e.g., initial onboarding).
- **`actions`**: Server actions for handling form submissions and data mutations.
- **`api`**: Next.js API route handlers.

### `src/components`
Contains reusable React components, organized by scope:
- **`common`**: Shared components used across multiple features (e.g., layouts, navigation).
- **`feature-specific`**: Components tightly coupled to specific features (e.g., transaction forms, charts).
- **`ui`**: Base UI elements (buttons, inputs, dialogs) typically built with Tailwind/Radix UI.

### `src/lib`
Contains core logic, services, and utilities:
- **`auth`**: Authentication logic, session management, and JWT handling.
- **`constants`**: Application-wide constants and configuration.
- **`db`**: Database connection setup, queries, and migrations.
- **`env`**: Environment variable validation (e.g., using Zod).
- **`hooks`**: Custom React hooks.
- **`services`**: Business logic and data fetching services.
- **`store`**: Global state management (Zustand).
- **`types`**: TypeScript type definitions.
- **`utilities`**: Helper functions (date formatting, currency formatting).

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js** (>= 20)
- **Bun** (recommended for running db scripts)
- **PostgreSQL** (local or hosted database)

### 2. Environment Variables
Create a `.env.local` (or `.env`) file in the root directory and set the following:
```env
# Postgres connection string
DATABASE_URL="postgres://user:password@localhost:5432/finance_tracker"

# Long random secret for signing JWT sessions
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. Installation
Install project dependencies:
```bash
npm install
```

### 4. Database Setup
Run the following Bun scripts to prepare the database:

```bash
# 1. Apply SQL migrations (creates tables, idempotent)
bun run db:migrate

# 2. Seed default reference data (categories) + optional admin user
bun run db:seed
```

*(Optional)* **Seed an Admin User**:
If you want a ready-to-login admin user seeded automatically, add these variables to your `.env.local` *before* running `db:seed`:
```env
SEED_ADMIN_USER_ID="<uuid>"
SEED_ADMIN_EMAIL="<email>"
SEED_ADMIN_PASSWORD="<password>"
```

### 5. Start Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Optional: Import Historical Data

After seeding the database, you can optionally import historical transactions from a CSV file into the seeded admin user's account.

1. Ensure the CSV is placed at `data/historical-transactions.csv`.
2. Run the import script:
```bash
bun run db:data
```

**Optional Environment Variables for Import:**
- `DATA_IMPORT_CSV`: Path to CSV (default: `data/historical-transactions.csv`)
- `DATA_IMPORT_ACCOUNT_NAME`: Target account name (default: `Cash`)
- `DATA_IMPORT_DEFAULT_LOCATION`: Default location (default: `Hyderabad`)
- `DATA_IMPORT_EMAIL`: Safety check; must match the seeded admin user’s email.
- `DATA_IMPORT_DRY_RUN=1`: Run in dry-run mode (validate only, no database inserts).

---

## 🛠 Available Commands

- `npm run dev`: Start Next.js development server
- `npm run build`: Create a production build
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking
- `bun run db:migrate`: Apply SQL migrations (`src/lib/db/migrations/*.sql`)
- `bun run db:seed`: Seed default categories + admin user
- `bun run db:data`: Import transactions from CSV
- `bun run db:reset`: Drop all tables/enums then re-apply migrations (⚠️ Dangerous)
- `bun run db:reset:data`: Reset transactions and re-import from CSV
- `bun run db:reset:all`: Reset database entirely, re-seed, and re-import CSV
