# Code Review Practices and Standards

This document establishes the official code review process, standards, and etiquette rules for the production development cycle.

---

## 1. Directory Structure

All related files are located under:
- Pull Request Template: [pull_request_template.md](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.github/pull_request_template.md)
- Code Review Guide: [code_review_standards.md](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/documents/code_review_standards.md)

---

## 2. Code Review Philosophy & Etiquette

Code reviews are a collaborative tool designed to share knowledge, maintain consistency, and catch bugs before production deployment. They are **not** personal critiques.

### A. Author Guidelines
* **Perform a Self-Review**: Before asking for reviews, open your own pull request diff and review the changes line-by-line to catch commented-out code, debug statements, or missing document comments.
* **Keep Pull Requests Focused**: Limit PR scopes. Smaller PRs (< 250 lines) get reviewed faster, get higher quality feedback, and carry less risk.
* **Respond to Feedback Constructively**: Explain the reasoning behind your approach respectfully, but remain open to superior alternative solutions.

### B. Reviewer Guidelines
* **Tone matters**: Phrase feedback as questions or recommendations, not demands. (e.g., instead of *"Change this to use an async map"*, try *"Could we use Promise.all here to run these requests concurrently?"*).
* **Separate Critique from Value**: Evaluate the *code*, not the *person*.
* **Acknowledge Good Code**: Don't just point out mistakes; highlight clean solutions, optimized algorithms, or excellent unit tests.

---

## 3. Feedback Severity Scale

To prevent debates on style preferences from blocking merges, all review comments must be prefixed with a severity tag:

| Tag | Meaning | Blocks Merge? |
| :--- | :--- | :--- |
| **[Blocker]** | Correctness bug, security vulnerability, test breakage, or major architectural flaw. | **Yes** |
| **[Should-Fix]** | Important pattern consistency, missing unit tests, or suboptimal logic. | **No** (Recommended) |
| **[Nitpick]** | Minor style preference, grammar/typo correction, or code formatting. | **No** |
| **[Question]** | Asking for clarification or context about a specific code pattern. | **No** |

---

## 4. Technical Checklist for Reviewers

Reviewers should evaluate pull requests against these technical criteria:

1. **SOLID Principles**: Are classes and functions cohesive, focused, and decoupled?
2. **Database Queries**: Are database interactions using parameterizations (preventing SQL/NoSQL injections) and matching indexing rules?
3. **Telemetry & Observability**: Are critical business events logged with correct logging levels and correlation IDs?
4. **Performance & Memory**: Are stream pipes properly closed? Are event listeners detached to prevent memory leaks?
5. **Test Coverage**: Are success, error, and boundary/edge conditions covered by unit tests?

---

## 5. Programmatic Enforcement (Pre-commit Git Hooks)

To ensure high-quality standards before reviews start, the project uses git hooks to lint staged changes automatically:
- **Lint Check Execution**: Running `npm run lint` evaluates all source code files using the rules in [eslint.config.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/eslint.config.js).
- **Git Hook Tunnel**: On every `git commit` attempt, **Husky** invokes [pre-commit](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.husky/pre-commit) which triggers **lint-staged**.
- **Auto-fixing Styles**: Files currently in the staging area are formatted and linted automatically before the commit proceeds, preventing standard violations from ever reaching the pull request phase.
- **Emergency Bypass**: In emergency cases (e.g. documentation edits or urgent hotfixes where style checks are irrelevant), you can bypass hooks by appending the `--no-verify` flag to your commit command:
  ```bash
  git commit -m "docs: urgent update" --no-verify
  ```
