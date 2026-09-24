# Dependency Triage — 2026-09-24

## Added this cycle

- `fflate` (pure-JS zlib, zero dependencies, no native code): powers
  DOCX unzip and PDF FlateDecode in workers, Node, and browsers. No
  publish-time scripts, no platform bindings. Lowest-risk option surveyed
  (rejected: pdfjs-dist weight, unzip libs with native bindings, devDep
  imports into prod code).

## expo-doctor: 15/18 pass (pre-existing drift, untouched)

Failing checks are SDK-52 expected-version drift in the pre-existing tree
(e.g. expo-linking, expo-secure-store, react-native-screens minor gaps).
`package.json`/`package-lock.json` show no unrelated changes on this branch.
Not fixed deliberately: the app builds (`export:web` green), all 167 tests
pass, and aligning majors (Expo 52→54 line) is a migration project with
regression risk — explicitly out of scope per dependency-stability rules.
Revisit trigger: any runtime crash traced to a drifted package.

## npm audit: 35 findings, all build/dev toolchain (accepted)

- Critical `tar` (node-tar traversal/DoS): reachable only via `@expo/cli`
  scaffolding at build time. Draftoryn never extracts tar archives — the
  upload path rejects them (415) and DOCX uses fflate allowlisted entries.
- Critical `vitest` UI-server advisory: requires the Vitest UI server
  listening; CI/dev runs `vitest run` only; dev-only in any case.
- Remaining highs/moderates: metro/postcss/xmldom/query-string inside
  Expo/metro/vitest tooling. Our runtime XML parsing is hand-rolled with
  XXE guards (no xmldom), YAML uses the safe JSON subset.
- No `npm audit fix --force`: major-range churn in the Expo toolchain
  would destabilize the working build for zero runtime benefit.

## Standing rule

Patch only on: (a) a finding reachable from shipped runtime code,
(b) a reproducible failure, or (c) a dedicated dependency-migration task
with its own test cycle.
