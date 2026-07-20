# 🚀 Eyan AI Platform

> An open-source, self-hosted AI platform for building, deploying, and managing modern conversational AI applications.

![Status](https://img.shields.io/badge/status-active%20development-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Backend](https://img.shields.io/badge/backend-Node.js-success)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Language](https://img.shields.io/badge/language-TypeScript-blue)

---

## 🌟 Vision

Eyan AI Platform aims to provide developers with a production-ready, self-hosted alternative for building AI-powered applications.

The platform is designed with scalability, security, and extensibility in mind, allowing developers to integrate local or cloud-based Large Language Models (LLMs) while maintaining full control over their infrastructure.

---

## ✨ Planned Features

### 🤖 AI

- ChatGPT-style interface
- Ollama integration
- Multiple AI providers
- Streaming responses
- Conversation history
- Prompt templates

### 🔐 Authentication

- User registration
- Login / Logout
- JWT Authentication
- Refresh Tokens
- Protected Routes
- Role-Based Access Control (RBAC)

### 📚 Knowledge Base

- File uploads
- Document indexing
- Retrieval-Augmented Generation (RAG)
- Vector database integration

### ⚙️ Administration

- Admin dashboard
- User management
- API key management
- Usage analytics
- System monitoring

### 🛠 Developer Experience

- REST API
- OpenAPI / Swagger
- Docker deployment
- GitHub Actions
- Automated testing
- CI/CD pipeline

---

# 🏗 Architecture

```text
                ┌─────────────────────────────┐
                │        React Frontend       │
                └──────────────┬──────────────┘
                               │
                        REST / Streaming
                               │
                ┌──────────────▼──────────────┐
                │      Express Backend        │
                └──────────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
     Ollama               Future Providers        Database
```

---

# 🧰 Tech Stack

## Frontend

- React
- TypeScript
- Vite

## Backend

- Node.js
- Express
- TypeScript

## AI

- Ollama

## Infrastructure

- Docker
- Ubuntu Linux
- pnpm

---

# 📁 Repository Structure

```text
eyan-ai-platform/
├── backend/
├── frontend/
├── .github/
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

# 🚀 Getting Started

## Clone the repository

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

# 🗺 Roadmap

## ✅ Phase 1 — Repository Foundation

- Repository structure
- TypeScript setup
- Express backend
- React frontend
- Community health files

## 🚧 Phase 2 — Engineering Excellence

- GitHub Actions
- ESLint
- Prettier
- Husky
- lint-staged
- Automated testing

## 📅 Phase 3 — Core Platform

- Authentication
- Database
- User Management
- Sessions

## 📅 Phase 4 — AI Features

- Chat
- Multi-provider support
- Conversation history
- Knowledge base

## 📅 Phase 5 — Production

- Monitoring
- Scaling
- High availability
- Deployment automation

---

# 🤝 Contributing

Contributions are welcome!

Please read:

- `.github/CONTRIBUTING.md`

before submitting issues or pull requests.

---

# 🔒 Security

If you discover a security vulnerability, please follow the instructions in:

- `.github/SECURITY.md`

---

# 📄 License

This project is licensed under the MIT License.

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.
