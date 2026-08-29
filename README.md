<div align="center">

# Draftoryn

**Professional Technical Specification & Security Document Studio**

*Draft authoritative software requirements, cloud architecture blueprints, and legally binding security agreements in seconds.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native Web](https://img.shields.io/badge/React%20Native-Web-61DAFB?style=flat-square&logo=react&logoColor=black)](https://necolas.github.io/react-native-web/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless%20Postgres-00E599?style=flat-square&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%20Inference-F55036?style=flat-square)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## 📌 Overview

**Draftoryn** is an enterprise-grade technical document studio designed for engineering leads, cloud architects, cybersecurity consultants, and product teams. 

Instead of wrestling with fragile Word templates or dealing with hallucinated unstructured AI output, Draftoryn combines **domain-specific canonical frameworks** (IEEE 830 / ISO 29148, PTES, STRIDE, NIST SP 800-115) with ultra-high-throughput **Groq LLaMA-3.3 inference** to produce publication-ready, legally sound, and structured specifications in seconds.

### Why Draftoryn?

- ⚡ **Zero Hallucination Guarantee**: Strict operational boundaries prevent AI from fabricating live IPs, domains, cryptographic keys, testing windows, or findings.
- 📐 **Dual Engine Pipeline**: Hybrid architecture combining a deterministic structural rule engine with high-speed LLM context completion.
- 📑 **Publication-Ready Exports**: Instant conversion to bordered executive PDFs, formatted Microsoft Word `.docx` documents, GitHub Markdown, structured JSON, XML, and YAML.
- ☁️ **Direct Serverless Edge**: Zero dedicated backend required. Connects directly from client/edge to Clerk Auth $\rightarrow$ Neon PostgreSQL $\rightarrow$ Groq AI. Ready for 1-click Cloudflare Pages / Vercel hosting.

---

## 🌟 Key Features

### 1. Document Catalog & Templates (100+ Frameworks)
- **Software Engineering**: Software Requirements Specifications (SRS IEEE 830 / ISO 29148), System Architecture Documents (SAD), Technical RFCs, and REST API contracts.
- **Offensive Security & Pentesting**: Penetration Testing Authorization Agreements (PTES), Rules of Engagement (RoE), Scope Definition Sheets, and Statements of Work (SoW).
- **Cloud Architecture & Threat Modeling**: STRIDE Threat Models, AWS/GCP Infrastructure Blueprints, Disaster Recovery Plans, and Trust Boundary Inventories.
- **Incident Response & Compliance**: Incident Response Playbooks (NIST SP 800-61), Chain of Custody logs, Vulnerability Disclosure Policies (VDP), and SOC 2 / ISO 27001 readiness checklists.

### 2. Live 3-Column Document Studio
- **Section Navigator**: Interactive outline tree with live completeness indicators (`GENERATED`, `EDITED`, `MISSING`, `ASSUMPTION`).
- **Structured Block Canvas**: WYSIWYG editor supporting headings, editable paragraphs, threat tables, callout blocks, and bullet matrices.
- **Context & Source Inspector**: Live parameter drawer to modify scope, IP ranges, dates, or organizational details and regenerate individual sections on the fly.
- **Non-Destructive Version History**: Instant snapshot restoration with automatic change diff tracking.

### 3. Multi-Format Export Engine
| Format | Description | Target Use Case |
| :--- | :--- | :--- |
| **PDF** | Bordered executive layout with formal typography & discreet watermark | Client sign-offs, legal agreements, compliance audits |
| **DOCX** | Structured Word document with standard heading styles and tables | Corporate redlining, enterprise procurement |
| **Markdown** | Clean GitHub Flavored Markdown (GFM) | Engineering wikis, Git repositories, developer docs |
| **JSON / YAML** | Structured semantic data model | CI/CD validation, automated compliance pipelines |
| **XML / HTML** | Standalone web and interchange format | Archival, web publishing, portal embeds |

---

## 🏗️ Architecture

Draftoryn is engineered for high performance, zero operational maintenance, and direct serverless deployment:

```
┌─────────────────────────────────────────────────────────────┐
│                   Draftoryn Web / Mobile                   │
│             (Expo 52 · React Native Web · Hono)             │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        Direct Clerk Auth             Direct Inference
               │                              │
               ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      Neon PostgreSQL        │  │     Groq AI Hardware       │
│  (@neondatabase/serverless) │  │  (LLaMA 3.3 70B Versatile) │
│  User-isolated Persistence  │  │  < 5s Multi-page Drafting  │
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
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:pass@ep-host.aws.neon.tech/neondb?sslmode=require

# Groq AI Acceleration
EXPO_PUBLIC_GROQ_API_KEY=gsk_...
EXPO_PUBLIC_GROQ_BASE_URL=https://api.groq.com/openai/v1
EXPO_PUBLIC_GROQ_MODEL=llama-3.3-70b-versatile
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

Draftoryn exports directly to static web assets for 1-click hosting on **Cloudflare Pages**, **Vercel**, or **AWS S3 / CloudFront**:

```bash
# Build static web distribution bundle
npm run export:web

# Preview the production output locally
node serve-dist.mjs
```

---

## 🛡️ Security & Privacy Philosophy

1. **Explicit Scoping & Placeholders**: The generation pipeline will never hallucinate or invent factual parameters (CIDRs, emails, dates, hostnames). Any missing required field is formatted as an explicit callout or placeholder.
2. **Client-Isolated Database**: Every document query in Neon enforces owner-level isolation mapped to Clerk authenticated user tokens.
3. **No Central API Logging of Sensitive Scopes**: Document contents and API payloads are processed through direct stateless edge connections.

---

## 📄 License

This project is licensed under the MIT License.
