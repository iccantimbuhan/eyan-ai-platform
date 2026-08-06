# ADR-0033 — Data Ingestion Architecture

**Status: Proposed — not implemented in Sprint 0.** Sprint 0 is tenancy foundation only. This ADR records the intended design ahead of Sprint 3, per the approved architecture package.

## Context

The platform must ingest POS reports and related restaurant data from Excel, CSV, PDF, images (OCR), manual entry, and — later — direct POS/Wolt/Bolt/accounting APIs. Framed narrowly as "Restaurant Sales Import," this would be Restaurant-specific; framed as a general capability any future operational module (Retail's own POS exports, for instance) will eventually need, it belongs at the platform level, alongside AI Core and the MCP connector registry, not inside Restaurant Ops.

## Decision

Introduce `backend/src/ingestion/` as a registry-pattern layer, structurally identical to the existing `McpConnectorFactory`:

- An `IngestionSource` interface: `parse(rawInput) → NormalizedIngestionPayload`.
- Concrete adapters registered into an `IngestionSourceFactory`: `ManualEntrySource`, `ExcelSource`, `CsvSource`, `PdfSource`, `ImageOcrSource` first; `PosApiSource`, `WoltApiSource`, `BoltApiSource`, `AccountingSource` reserved for later, registering into the same factory with no change to callers.
- Business modules never parse files themselves — they call `IngestionService.ingest(sourceType, branchId, rawInput)` and receive a normalized payload, mirroring "business modules invoke AI Core Capabilities, never providers directly."
- File storage reuses the existing `multer` disk-storage pattern (`video-upload.middleware.ts`) — no object storage introduced.

## Consequences

Positive:
- One proven pattern (the MCP registry) reused for a second purpose; a future module gets ingestion for free by registering its own source, not reimplementing the registry.

Negative:
- A small amount of upfront abstraction (the `IngestionSource` interface) exists before there's a second real consumer — justified here because the catalog of sources (Excel/CSV/PDF/OCR/future APIs) is specified up front in the product brief, unlike most premature abstractions.
- OCR accuracy against a handwritten inventory notebook is unproven; sequence it last (after manual entry, Excel, CSV, PDF are validated with real data), per the Sprint Roadmap.

## Alternatives Considered

1. Restaurant-scoped `restaurant-sales-import-*` files only, no shared registry — rejected; repeats the same registry pattern per future module instead of building it once.
2. A generic file-upload microservice — rejected; unnecessary infrastructure with no scale justification at this stage.
