# Security Model — Document Intelligence

Uploads are HIGH-SENSITIVITY DATA (credentials, tokens, PII, infra detail).

## Tenancy

- Every intelligence row carries `owner_id`; every query scopes
  `WHERE owner_id = auth user`. `owner_id` is never accepted from clients.
- Foreign ids return 404 (no existence oracle). Verified by
  `tests/intelligence-api.test.ts` (scenario F + static owner-scope audit).

## Upload hardening

- Per-file 10 MB, aggregate 50 MB, 2M text chars, 20k records/file caps.
- Magic-byte verification (`identify.ts`); extension is a hint only.
- Archives rejected (submit extracted files); PDFs/images recorded
  metadata-only in v1 (no server-side decompression/rendering).
- XML: ENTITY declarations and DOCTYPE internal subsets rejected (XXE).
- YAML: safe `JSON_SCHEMA` subset. Filenames sanitized, never used as paths.
- Checksums (SHA-256) power duplicate detection and storage keys
  (`t/{owner}/{analysis}/{checksum}/{file}` — no public buckets).

## Storage

- `StorageProvider` abstraction with a durability chain: R2 when
  `R2_*` env is configured → Neon `artifact_blobs` BYTEA side table when
  `DATABASE_URL` is set → in-memory (per-isolate best-effort) otherwise.
  Neon holds metadata/references plus the BYTEA fallback — never blobs
  inside JSONB document fields, never public buckets.
- Deleting an analysis removes blobs (best-effort) then cascades rows.

## AI & secrets

- Uploaded content is UNTRUSTED DATA wrapped in evidence envelopes; it can
  never outrank system/application instructions (see AI_GROUNDING.md).
- Redaction detects keys/tokens/emails; originals preserved with
  `redactionState` marked. Secret/content logging is forbidden; telemetry
  uses one-way summaries (`redactionSummary`).

## Abuse & cost controls

- Per-user rate limits: analyses 20/min, uploads 30/min, generation 30/min.
- Bounded AI context (8 records × 3k chars per finding); deterministic
  extraction runs before any LLM call; no duplicate content re-sent.

## Jobs

- `intelligence_jobs` + `intelligence_job_events` persist state
  (queued→…→completed/failed; illegal transitions rejected). UI polls;
  refresh-safe.
