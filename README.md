<div align="center">

# Draftoryn

**Authoritative Cybersecurity Document Studio**

*Draft standardized security agreements, incident response playbooks, threat models, and audit reports in seconds.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native Web](https://img.shields.io/badge/React%20Native-Web-61DAFB?style=flat-square&logo=react&logoColor=black)](https://necolas.github.io/react-native-web/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless%20Postgres-00E599?style=flat-square&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## 📌 Overview

**Draftoryn** is an enterprise-grade cybersecurity document studio designed for security consultants, penetration testers, incident responders, security architects, and GRC leaders.

Instead of wrestling with fragile Word templates or dealing with hallucinated AI output, Draftoryn provides a canonical catalog of **30 core cybersecurity documents across 6 specialized domains**. Draft documents with deterministic structural accuracy by default, with opt-in AI synthesis requiring explicit scope and organizational context.

### Why Draftoryn?

- ⚡ **Zero Hallucination Guarantee**: Strict operational boundaries prevent AI from fabricating live IPs, domains, cryptographic keys, testing windows, or findings.
- 📐 **Dual Engine Pipeline**: Deterministic structural rule engine by default, with optional context-validated AI synthesis.
- 📑 **Publication-Ready Exports**: Instant conversion to bordered executive PDFs, formatted Microsoft Word `.docx` documents, GitHub Markdown, structured JSON, XML, and YAML.
- ☁️ **Direct Serverless Edge**: Cloud-synchronized persistence via Neon PostgreSQL with Clerk authentication and offline caching.

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

Draftoryn is engineered for high performance, zero operational maintenance, and direct serverless deployment:

```
┌─────────────────────────────────────────────────────────────┐
│                   Draftoryn Web / Mobile                   │
│             (Expo 52 · React Native Web · Hono)             │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        Direct Clerk Auth             Context-Validated AI
               │                              │
               ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      Neon PostgreSQL        │  │     AI Inference Engine    │
│  (@neondatabase/serverless) │  │  (OpenAI-compatible edge) │
│  User-isolated Persistence  │  │   Opt-in context synthesis │
└─────────────────────────────┘  └────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js `18+` or `20+`
- npm, pnpm, or bun

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/aadithya-vimal/Draftoryn.git
cd Draftoryn
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set the required environment keys:
```env
# Client Public Configuration
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_BASE=http://localhost:8787

# Server Privileged Credentials (never exposed to client)
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://user:pass@ep-host.aws.neon.tech/neondb?sslmode=require
PORT=8787

# Server-Side AI (Opt-in, OpenAI-compatible)
DRAFTORYN_AI_API_KEY=...
DRAFTORYN_AI_BASE_URL=https://api.openai.com/v1
DRAFTORYN_AI_MODEL=gpt-4o-mini
```

### 3. Run Development Server
```bash
# Start the Expo Metro web bundler
npm run dev

# Open in browser at http://localhost:8081
```

### 4. Run Test Suite
```bash
npm test
npm run typecheck
```

---

## 📦 Production Deployment

Draftoryn exports directly to static web assets for hosting on **Cloudflare Pages**, **Vercel**, or **AWS S3 / CloudFront**:

```bash
# Build static web distribution bundle
npm run export:web

# Preview the production output locally
node serve-dist.mjs
```

---

## 🛡️ Security & Privacy Philosophy

1. **Deterministic Default**: Generation produces standard structural documents immediately without making unnecessary external API calls.
2. **Context-Required AI**: When opted into, AI generation requires verified user scope parameters and will never invent live IP ranges, domains, or credentials.
3. **Client-Isolated Database**: Every document query in Neon enforces owner-level isolation mapped to Clerk authenticated user tokens.

---

## 📄 License

This project is licensed under the MIT License.
