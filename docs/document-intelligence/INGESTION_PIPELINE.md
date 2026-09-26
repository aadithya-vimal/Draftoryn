# Ingestion Pipeline

`src/intelligence/ingestion/` (limits, media identification) +
`src/intelligence/parsers/` (registry + tool parsers + generic fallback).

## Flow per artifact

1. Size check (`MAX_FILE_BYTES` 10 MB, aggregate `MAX_TOTAL_BYTES` 50 MB).
2. Magic-byte sniff (`identify.ts`); extension is a tiebreak hint only.
   ZIP archives and PDFs are accepted as metadata-only artifacts in v1
   (no server-side decompression/rendering — see Limitations).
3. `selectParser()` tries specific parsers in order
   (nmap → nessus → burp → zap → nuclei → sarif → docx → pdf → image),
   generic fallback last. Binary parsers require raw bytes (never
   TextDecoder-corrupted text); the run path passes bytes through.
4. Parser emits normalized raw evidence/assets/observations with
   `sourceLocation` pointers and confidence. No parser logs content,
   executes content, or touches the network.

## Binary formats

- DOCX: in-memory unzip via fflate (pure-JS inflate, worker-safe).
  Allowlisted entries only (`word/document.xml`, headers/footers,
  comments, core props); per-entry 5 MB, total 20 MB, compression-ratio
  bomb guard. Entries are read by exact name — zip-slip impossible.
- PDF: FlateDecode streams + Tj/TJ operators; encrypted or exotic-filter
  PDFs degrade to metadata-only with warnings. No xref/JS/actions.
- Images: metadata-only evidence (dimensions where cheap); pixel analysis
  goes through the AI vision flow (`POST .../artifacts/:aid/describe`).
- Plain ZIP archives remain rejected (submit extracted files; `.docx`
  is verified OOXML, not a generic archive).

## Safety

- XML: `assertSafeXml` rejects ENTITY declarations and DOCTYPE internal
  subsets (XXE / billion-laughs). Bare stock doctypes (e.g. nmap) allowed.
- YAML: `js-yaml` with `JSON_SCHEMA` (safe subset only).
- Filenames sanitized via `sanitizeFilename`; never used as paths.
- Record/evidence/char caps keep output bounded and deterministic
  (same bytes → same normalized output, byte-for-byte).

## Parser versions

nmap 1.0.0, nessus 1.0.0, nuclei 1.0.0, zap 1.0.0, burp 1.0.0, sarif 1.0.0,
docx 1.0.0, pdf 1.0.0, image 1.0.0, generic 1.0.0. Versions are recorded on
every SourceArtifact for reproducibility.
