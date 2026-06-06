# Technical Debt Management Guidelines

This document outlines the framework, classifications, prioritization processes, and standards for managing and resolving technical debt in this codebase.

---

## 1. Directory Structure

All related files are located under:
- Backlog Registry: [tech_debt_backlog.md](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/documents/tech_debt_backlog.md)
- Management Guide: [tech_debt_management.md](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/documents/tech_debt_management.md)

---

## 2. Technical Debt Quadrant

We classify technical debt using Ward Cunningham's Technical Debt Quadrant to evaluate its origin:

```
                  Reckless                      Prudent
        +-----------------------------+-----------------------------+
        | "We don't have time for     | "We must ship now and       |
        | design or tests."           | refactor right after."      |
        |                             |                             |
        |  (Reckless-Deliberate)      |  (Prudent-Deliberate)       |
        |                             |                             |
        +-----------------------------+-----------------------------+
        | "What is SOLID?"            | "Now we know how we should  |
        |                             | have designed this."        |
        |                             |                             |
        |  (Reckless-Accidental)      |  (Prudent-Accidental)       |
        +-----------------------------+-----------------------------+
```

* **Prudent-Deliberate**: We purposefully choose a simpler path to meet a critical market release deadline, documenting the decision in an ADR and immediately listing a debt item in the backlog.
* **Prudent-Accidental**: We designed the system correctly based on the requirements at the time, but as the project scaled, new patterns emerged (e.g. migrating to microservices) that made the legacy code feel like debt.

---

## 3. Prioritization Framework

Technical debt items are prioritized in [tech_debt_backlog.md](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/documents/tech_debt_backlog.md) using a simple evaluation score:

$$\text{Priority Score} = \text{Impact} \times \text{Urgency (Cost of Delay)} - \text{Effort}$$

* **High Impact / Low Effort** tasks (e.g., adding a missing database index) are addressed immediately.
* **High Impact / High Effort** tasks (e.g., refactoring microservice routing layers) are planned as dedicated epic tickets.

---

## 4. Operational Standards & Process

To prevent technical debt from accumulating, the team adheres to these practices:

### A. Pre-commit Quality Gates
Enforce coding styles natively via ESLint and Husky commit hooks. If the developer tries to commit code containing formatting errors or unused variables, the pre-commit hook automatically blocks it, preventing code quality debt from merging.

### B. Standard Code Annotations
When leaving placeholder code or temporary hotfixes, developers must use standard annotations linking to a backlog item:
* `// TODO: [TD-003] Add index to email field to optimize queries`
* `// FIXME: [TD-002] Remove duplicate dependency commands once base image is built`

### C. Capacity Commitment
Product and Engineering agree to dedicate **20% of every development cycle / sprint capacity** directly to refactoring and paying down prioritized items in the backlog log.
