# Eyan AI Platform API Specification

Version: 1.0

---

# API Philosophy

The API follows REST principles.

Goals:

- Predictable
- Consistent
- Versioned
- Secure
- Easy to extend

Base URL

/api/v1

---

# Authentication

POST /auth/login

POST /auth/logout

POST /auth/refresh

GET /auth/me

PATCH /auth/profile

PATCH /auth/password

---

# Dashboard

GET /dashboard/stats

GET /dashboard/activity

GET /dashboard/health

---

# Projects

GET /projects

GET /projects/:id

POST /projects

PATCH /projects/:id

DELETE /projects/:id

POST /projects/:id/archive

POST /projects/:id/restore

---

# Conversations

GET /conversations

GET /conversations/:id

POST /conversations

PATCH /conversations/:id

DELETE /conversations/:id

---

# Messages

GET /messages

POST /messages

DELETE /messages/:id

---

# Providers

GET /providers

GET /providers/:id

POST /providers

PATCH /providers/:id

DELETE /providers/:id

POST /providers/:id/test

GET /providers/:id/health

---

# Models

GET /models

GET /models/:id

POST /models

PATCH /models/:id

DELETE /models/:id

---

# Prompt Library

GET /prompts

GET /prompts/:id

POST /prompts

PATCH /prompts/:id

DELETE /prompts/:id

---

# Prompt Categories

GET /prompt-categories

POST /prompt-categories

PATCH /prompt-categories/:id

DELETE /prompt-categories/:id

---

# Generated Content

GET /content

GET /content/:id

POST /content/generate

DELETE /content/:id

---

# Users

GET /users

GET /users/:id

POST /users

PATCH /users/:id

DELETE /users/:id

---

# Roles

GET /roles

GET /roles/:id

POST /roles

PATCH /roles/:id

DELETE /roles/:id

---

# Permissions

GET /permissions

GET /permissions/:id

---

# Settings

GET /settings

PATCH /settings

---

# Audit Logs

GET /audit-logs

GET /audit-logs/:id

---

# Health

GET /health

GET /health/live

GET /health/ready

---

# Standard Success Response

{
  "success": true,
  "message": "Success",
  "data": {}
}

---

# Standard Error Response

{
  "success": false,
  "message": "Validation failed",
  "errors": []
}

---

# HTTP Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# Versioning Strategy

Current Version

/api/v1

Future

/api/v2

Older versions remain supported until officially deprecated.

---

# API Standards

- RESTful naming
- JSON only
- UUID identifiers
- Pagination support
- Search support
- Filtering support
- Sorting support
- Consistent validation errors
- Authentication required unless explicitly public

