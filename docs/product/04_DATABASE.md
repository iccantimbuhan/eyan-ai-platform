# Eyan AI Platform Database Architecture

Version: 1.0

---

# Database Philosophy

The database is designed to support long-term scalability while keeping the initial version simple.

Every entity should have:

- UUID Primary Key
- createdAt
- updatedAt
- createdBy (where applicable)
- updatedBy (where applicable)
- deletedAt (Soft Delete when applicable)

---

# Current Core Entities

## User

Purpose

Represents authenticated users.

Relationships

- Roles
- Projects
- Chats
- Prompts

---

## Role

Purpose

Role-Based Access Control.

Relationships

- Permissions
- Users

---

## Permission

Purpose

Defines system permissions.

Relationships

- Roles

---

## ContentProject

Purpose

Container for AI work.

Relationships

- Conversations
- Prompts
- Generated Content

---

# Version 1.0 Entities

## Conversation

Stores chat sessions.

Relationships

- Project
- Messages
- Provider
- Model

---

## Message

Stores chat messages.

Relationships

- Conversation
- User

---

## Provider

Stores AI providers.

Examples

- Ollama
- OpenAI
- Anthropic
- OpenRouter
- Groq

Relationships

- Models

---

## Model

Stores AI models.

Examples

- llama3
- mistral
- qwen
- claude
- gpt

Relationships

- Provider

---

## Prompt

Reusable prompt library.

Relationships

- Project
- Categories
- Tags

---

## PromptCategory

Prompt grouping.

---

## PromptTag

Prompt labeling.

---

## GeneratedContent

Stores generated AI content.

Relationships

- Project
- Prompt
- Provider

---

## AuditLog

Tracks important actions.

Examples

- Login
- Delete
- Update
- Permission Changes

---

## Settings

Stores application configuration.

---

# Future Entities

## Agent

AI Agent.

---

## Workflow

Workflow definitions.

---

## WorkflowExecution

Workflow execution history.

---

## Memory

Persistent AI memory.

---

## KnowledgeBase

Knowledge collections.

---

## Document

Uploaded documents.

---

## Embedding

Vector embeddings.

---

## VectorStore

Future RAG support.

---

## Notification

System notifications.

---

## ApiKey

API Keys.

---

## Organization

Future multi-tenancy.

---

# Entity Relationships

User

↓

Projects

↓

Conversations

↓

Messages

↓

Generated Content

---------------------

Provider

↓

Models

↓

Conversations

---------------------

Prompt Categories

↓

Prompts

↓

Generated Content

---------------------

Roles

↓

Permissions

↓

Users

---

# Database Rules

- UUID everywhere
- Soft delete where appropriate
- Audit sensitive operations
- Avoid duplicated data
- Foreign keys for relationships
- Index searchable columns
- Consistent naming conventions

---

# Future Considerations

Version 2+

- Multi-tenancy
- Vector database
- AI memory
- Team collaboration
- Workflow engine
- Plugin architecture

