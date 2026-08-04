# Backend

Stack

Node.js

Express

TypeScript

Prisma

PostgreSQL

---

Architecture

Controller

↓

Service

↓

Repository

↓

Prisma

---

Rules

Controllers contain no business logic.

Services own business logic.

Repositories own database access.

Validators validate requests.

DTOs shape responses.

Never bypass layers.

Never access Prisma from controllers.

