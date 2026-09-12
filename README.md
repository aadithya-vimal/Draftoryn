<div align="center">

<img src="./assets/logo.png" alt="Draftoryn — Professional Cybersecurity Documents" width="460" />

<br/><br/>

**Draftoryn — professional cybersecurity documents, generated precisely.**

*Choose a document → answer guided questions → AI generates a draft → review/edit → export.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native Web](https://img.shields.io/badge/React%20Native-Web-61DAFB?style=flat-square&logo=react&logoColor=black)](https://necolas.github.io/react-native-web/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless%20Postgres-00E599?style=flat-square&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## 📌 Overview

**Draftoryn** is a cybersecurity document generator for penetration testers, security consultants, incident responders, and GRC teams.

Instead of wrestling with fragile Word templates or copy-pasting from a chatbot, Draftoryn walks you through a focused flow: **choose one of 30 canonical cybersecurity documents, answer guided questions, let AI draft from your real answers, review and edit every section, then export** a precise deliverable.

### Why Draftoryn?

- ⚡ **Zero Hallucination Guarantee**: strict operational boundaries prevent AI from fabricating IPs, domains, credentials, testing windows, authorizations, or findings. Missing data becomes explicit placeholders, never invented facts.
- 📐 **Dual Engine Pipeline**: deterministic structural engine by default, with optional context-validated AI synthesis (OpenAI, Anthropic, Groq, Gemini) that drafts *only* from the data you entered.
- 📑 **Publication-Ready Exports**: PDF, DOCX, Markdown, HTML, JSON, XML, and YAML — with optional **password-protected (AES-256 ZIP) delivery** for every format.
- 🛡️ **Review-First Design**: AI can make mistakes. Export requires an explicit acknowledgement that you will review the document before any official or legal use.
- ☁️ **Direct Serverless Edge**: Clerk authentication, Neon PostgreSQL persistence with strict per-owner isolation, offline-tolerant client.

---

## 🌟 Document Catalog (30 Core Cybersecurity Documents)

Draftoryn is strictly scoped to 30 authoritative cybersecurity documents across 6 core domains:

### 1. Offensive Security
- **Rules of Engagement (RoE)**
- **Penetration Testing Agreement / Authorization**
- **Penetration Testing Plan**
- **Penetration Testing Report**
- **Red Team Assessment Report**
- **Vulnerability Assessment Report**
- **Security Assessment Report**

### 2. Incident Response / DFIR
- **Incident Response Plan**
- **Incident Response Playbook**
- **Incident Report**
- **Digital Forensics Report**
- **Malware Analysis Report**
- **Post-Incident / Lessons Learned Report**

### 3. Threat Intelligence
- **Threat Intelligence Report**
- **Threat Actor Profile**
- **Threat Assessment Report**
- **Campaign Analysis Report**

### 4. Security Architecture / Engineering
- **Threat Model (STRIDE)**
- **Security Architecture Document**
- **Security Design Review**
- **Cloud Security Assessment**
- **Application Security Assessment**

### 5. Risk / Governance
- **Cybersecurity Risk Assessment**
- **Risk Register**
- **Third-Party Security Assessment**
- **Security Exception / Risk Acceptance**

### 6. Resilience
- **Business Impact Analysis (BIA)**
- **Business Continuity Plan (BCP)**
- **Disaster Recovery Plan (DRP)**
- **Cyber Recovery Plan**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Draftoryn Web App (Expo · React Native Web)    │
│              expo-router · Cloudflare Pages (static SPA)    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
      Clerk Bearer Auth              Validated generation calls
               │                              │
               ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      Hono API (Node /       │  │     AI Inference Engine    │
│      Cloudflare Workers)    │  │  OpenAI · Anthropic ·      │
│  Zod validation · rate      │  │  Groq · Gemini (BYOK or    │
│  limits · strict CORS ·     │  │  server keys, guarded)     │
│  owner-scoped Neon queries  │  │  Prompt-injection hardened │
└──────────────┬──────────────┘  └────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Neon PostgreSQL        │
│  users · workspaces ·       │
│  user_settings · documents ·│
│  document_versions ·        │
│  document_exports           │
└─────────────────────────────┘
```

### Project layout

| Path | Contents |
| --- | --- |
| `app/` | Expo Router screens (landing, catalog, editor, auth, `/terms`, `/privacy`) |
| `server/` | Hono API (`index.ts`), generation (`generate.ts`), Neon data layer (`neon.ts`), security controls (`security.ts`), local runner (`node.ts`) |
| `src/engine/` | Document definitions, deterministic generator, AI providers/prompts, validators, exporters (PDF/DOCX/MD/HTML/JSON/XML/YAML) |
| `src/lib/` | Client utilities incl. AES-256 password-protected export (`protectedExport.ts`) |
| `src/ui/` | Design system, document graphics/animation (`DocGraphics.tsx`) |
| `db/` | `schema.sql`, `validate.mjs`, `seed.mjs` |
| `tests/` | Vitest suites incl. auth/IDOR/validation/abuse/XSS/AI/export security tests |
| `public/` | Static assets + Cloudflare Pages `_headers` (CSP, HSTS, no-sniff) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js `18+` or `20+`
- npm
- A [Neon](https://neon.tech/) PostgreSQL database
- A [Clerk](https://clerk.com/) application (publishable + secret keys)

### 1. Clone & install
```bash
git clone https://github.com/aadithya-vimal/Draftoryn.git
cd Draftoryn
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

```env
# Client public configuration
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_BASE=http://localhost:8787

# Server privileged credentials (never exposed to the client)
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://user:pass@ep-host.aws.neon.tech/neondb?sslmode=require
PORT=8787

# Server-side AI keys (optional; users can also bring their own keys in Settings)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=

# Local development only (never set in production)
# ALLOW_DEV_AUTH=true

# Production CORS allowlist (comma-separated exact origins)
# ALLOWED_ORIGINS=https://draftoryn.com,https://app.draftoryn.com
```

### 3. Create the database schema
Apply `db/schema.sql` to your Neon database (Neon SQL editor or `psql`), then verify:
```bash
npm run db:validate
```

### 4. Run the API + app (two terminals)
```bash
# Terminal 1 — Hono API on http://localhost:8787
npm run server

# Terminal 2 — Expo web app on http://localhost:8081
npm run dev
```

### 5. Verify
```bash
npm test                # full Vitest suite (app + security tests)
npm run typecheck       # app / UI types
npm run typecheck:engine # server / engine / test types
```

---

## 📦 Production Deployment

**Frontend** — static export hosted on **Cloudflare Pages** (security headers ship via `public/_headers`):
```bash
npm run export:web
node serve-dist.mjs   # preview the production output locally
```

**API** — deploy `server/` with Wrangler (see `wrangler.toml`), providing `DATABASE_URL`, `CLERK_SECRET_KEY`, and AI keys as Worker secrets — never as `EXPO_PUBLIC_*` variables.

---

## 🛡️ Security & Privacy Philosophy

1. **Server-side authorization only**: every document query enforces `WHERE owner_id = <verified Clerk identity>`. Client-supplied owner IDs are discarded; foreign IDs return uniform 404s (no existence oracles). There are no RLS policies — explicit scoping is the documented, tested control.
2. **Fail-closed auth**: no Clerk secret + production = 401 everywhere. The local dev identity requires explicit `ALLOW_DEV_AUTH=true` outside production.
3. **Hardened API**: strict CORS allowlist (no origin reflection), per-IP + per-user rate limits (expensive AI generation capped hardest, 429s with `Retry-After`), 256–512KB JSON body caps, Zod validation on every input, security headers, redacted server-side logging.
4. **Deterministic default, guarded AI**: generation runs locally without external calls unless AI is requested; AI input is size/depth capped, endpoints are fixed (no custom base URLs), calls time out, outputs are schema-validated, and system prompts treat all user content as untrusted data.
5. **XSS-safe exports**: HTML/XML/Markdown exporters escape untrusted content, clamp heading levels, allowlist style hooks, neutralize dangerous URL schemes, and sanitize XML tag names.
6. **No secret leakage**: `.env` is gitignored, samples contain placeholders only, API keys never enter the client bundle, error responses are generic (diagnostics stay in server logs), and AI keys are stripped before settings persistence.
7. **Passwords stay on-device**: export passwords are used only for local AES-256 ZIP encryption and are never transmitted, stored, or logged.
8. **Terms of use**: by using Draftoryn you agree to the [Terms](/terms) and [Privacy Policy](/privacy). AI can make mistakes — review every document before official or legal use.

---

## 📄 License

This project is licensed under the MIT License.
