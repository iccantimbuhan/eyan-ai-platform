# 🚀 Eyan AI Platform

> A self-hosted, production-development enterprise platform: AI Core orchestration, Content Studio, CRM, Finance, and Automation (MCP), behind one Express/Prisma/PostgreSQL backend and one React/TanStack frontend.

![Status](https://img.shields.io/badge/status-active%20development-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Backend](https://img.shields.io/badge/backend-Node.js-success)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Language](https://img.shields.io/badge/language-TypeScript-blue)

---

## 🌟 Vision

A production-ready, self-hosted alternative for building AI-powered business applications — full control over infrastructure, multiple AI providers, no vendor lock-in.

---

## ✨ What's Built

### 🤖 AI Core

Centralized AI orchestration (Capability → Brain → Routing → Provider → Model → Prompt → Memory → MCP). Business modules invoke Capabilities only, never providers directly. Ollama, OpenAI, Anthropic, and Gemini are registered providers.

### 🗂 Content Studio

Content, image, and video generation with a QA review workflow (Draft → Needs Review → Approved/Rejected → Published), Asset Library, Brand Kits, version history, and a publishing pipeline.

### 📈 CRM

Lead management with a server-enforced lifecycle, AI-driven sales qualification (via AI Core), and a signed webhook integration with an external automation hub (n8n).

### 💰 Finance

Household expense and budget tracking with recurring expenses and a spending dashboard.

### 🔌 Automation (MCP)

A registry-based connector layer for external integrations, proven end-to-end and ready for real providers (Canva, GitHub, Slack, and others) to register into.

### 🔐 Authentication & Access

JWT auth, refresh tokens, and full role-based access control (RBAC).

### 🎬 Presentation Engine

A guided, narrated product-tour overlay that presents the real running application rather than a mockup.

---

# 🏗 Architecture

```text
        ┌─────────────────────────────┐
        │        React Frontend       │
        └──────────────┬──────────────┘
                        │
                REST / Streaming
                        │
        ┌───────────────▼──────────────┐
        │        Express Backend        │
        │  Controller → Service → Repo  │
        └───────────────┬───────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       Prisma        AI Core       MCP Connectors
          │              │              │
      PostgreSQL   Ollama/OpenAI/   (Canva, GitHub,
                   Anthropic/Gemini   Slack, ...)
```

Full architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

# 🧰 Tech Stack

## Frontend
React, TypeScript, Vite, TanStack Router, TanStack Query, shadcn/ui

## Backend
Node.js, Express, TypeScript, Prisma, PostgreSQL

## AI
Ollama, OpenAI, Anthropic, Gemini (text) · Gemini, ComfyUI (self-hosted), Hugging Face Inference Providers (images) — see [docs/COMFYUI_PROVIDER.md](docs/COMFYUI_PROVIDER.md), [docs/COMFYUI_SETUP.md](docs/COMFYUI_SETUP.md), [docs/HUGGINGFACE_PROVIDER.md](docs/HUGGINGFACE_PROVIDER.md), [docs/HUGGINGFACE_SETUP.md](docs/HUGGINGFACE_SETUP.md)

## Infrastructure
systemd, Nginx, Ubuntu Linux VPS, pnpm

---

# 📁 Repository Structure

```text
eyan-ai-platform/
├── backend/       Express API — controllers/services/repositories/providers
├── frontend/      React app — feature-based
├── docs/          Deep-reference documentation (architecture, product, engineering)
├── tasks/         Sprint history
├── .context/      AI assistant entry point — see AGENTS.md
├── README.md
└── LICENSE
```

---

# 🚀 Getting Started

```bash
git clone https://github.com/iccantimbuhan/eyan-ai-platform.git
cd eyan-ai-platform
```

## Backend

```bash
cd backend
pnpm install
pnpm dev
```

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

---

# 🤖 Working on this repo with an AI assistant?

Start at [AGENTS.md](AGENTS.md) — it routes to `.context/`, the single source of truth for AI-assisted engineering in this repository.

---

# 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting issues or pull requests.

---

# 🔒 Security

If you discover a security vulnerability, please follow the instructions in [.github/SECURITY.md](.github/SECURITY.md).

---

# 📄 License

MIT License.

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.
