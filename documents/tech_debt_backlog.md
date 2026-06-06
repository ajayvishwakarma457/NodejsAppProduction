# Technical Debt Backlog

This log tracks identified technical debt within the codebase. Each item is rated by priority, impact, and effort to facilitate systematically paying it down.

---

## 1. Active Backlog Items

| ID | Title / Description | Category | Impact | Effort | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TD-001** | **Clean up ESLint warnings in legacy tests**<br>Unused variables and import statements in integration tests trigger 36 ESLint warnings. | Code Quality | Low | Low | **Medium** | Open |
| **TD-002** | **Abstract shared Dockerfile parameters**<br>The 4 Dockerfiles have duplicated package installation scripts. Abstracting them into a base image will speed up CI pipelines. | Infrastructure | Medium | Medium | **Medium** | Open |
| **TD-003** | **Index user query fields in Mongoose**<br>The search/find filters inside `mongoUserRepositoryAdapter.js` query fields like `email` and `username`. Missing Mongoose index definitions will cause table scans on large user bases. | Performance | High | Low | **High** | Open |
| **TD-004** | **Consolidate mock database connectors in tests**<br>Integration tests re-declare manual mock configurations for Redis/Kafka/Mongoose individually, causing boilerplate duplication. | Test Debt | Medium | Medium | **Low** | Open |

---

## 2. Refactoring Log (Recent Pay-downs)

| ID | Title / Description | Date Resolved | Resolution Summary |
| :--- | :--- | :--- | :--- |
| **TD-000** | **Refactor legacy Mongoose query injection logic** | 2026-06-04 | Replaced direct database queries inside service constructors with the Repository & Service pattern, resolving coupling debt. |
