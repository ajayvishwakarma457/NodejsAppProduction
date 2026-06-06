# ADR-0002: Stateless Consistent Hashing for A/B Testing

* **Status**: Accepted
* **Date**: 2026-06-05
* **Author(s)**: Antigravity Agent

---

## 1. Context and Problem Statement
To execute user split-experiments (like pricing A/B tests), we need a method to distribute users to variant cohorts consistently. The allocation must be sticky (same user always sees the same variant) and performant, without increasing database query overhead or latency.

---

## 2. Decision Drivers
* Extreme low latency (zero remote calls to state databases).
* High scale concurrency.
* Allocation consistency (stickiness).

---

## 3. Options Considered
* **Option 1: Database Stateful Persistence**: Look up or assign variant tags in Redis/MongoDB for each user on query.
  * *Pros*: Simple query logic.
  * *Cons*: Adds a remote database read call to every single request, increasing overall API request latency.
* **Option 2: Stateless Consistent Hashing (SHA-256 Modulo)**: Compute the hash of `userId:experimentId`, map the digest to an integer between 0 and 99, and assign cohorts based on percentage ranges.
  * *Pros*: Deterministic, instantaneous CPU-only calculation, zero database traffic.
  * *Cons*: Requires developers to understand hash distributions; cannot dynamically reassort specific active users without updating overrides.

---

## 4. Decision Outcome
We selected **Option 2 (Stateless Consistent Hashing)**.

Justification: Modulo bucketing on the cryptographic hash digest guarantees deterministic cohort placement with sub-microsecond runtimes.

---

## 5. Consequences
* **Positive**: Sub-microsecond calculation time, scales infinitely without database overhead, easy to unit test.
* **Negative**: Overriding variant cohorts for specific internal test users must be configured separately (implemented via explicit override rules).
