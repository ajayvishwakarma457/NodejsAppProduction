# ADR-0001: Use Awilix for Dependency Injection

* **Status**: Accepted
* **Date**: 2026-06-04
* **Author(s)**: Antigravity Agent

---

## 1. Context and Problem Statement
As the Node.js production application scales and introduces microservices, managing manual instantiation of classes (services, repositories, database clients) inside routers leads to tightly coupled code. Mocking databases and services for unit tests becomes complex, requiring extensive global mocking hooks.

---

## 2. Decision Drivers
* Loose coupling of controllers, services, and outbound adapters.
* Facilitating ease of testing (mocking dependencies easily).
* Centralised configuration registry control.

---

## 3. Options Considered
* **Option 1: Manual Constructor Instantiation**: Re-create service instances inside routers/controllers.
  * *Pros*: Simple, zero external package footprint.
  * *Cons*: Tightly coupled, testing mocks require dirty module registry patching.
* **Option 2: Awilix Dependency Injection**: Use a constructor-injection framework utilizing proxies.
  * *Pros*: Automatic dependency resolution (autowiring), clean controller definitions, simple testing inject overrides.
  * *Cons*: Introduces dependency container overhead.

---

## 4. Decision Outcome
We selected **Option 2 (Awilix Dependency Injection)**. 

Justification: Awilix resolved dependencies implicitly through constructor arguments without forcing class logic to depend on container-specific APIs (non-intrusive DI), ensuring domain entities remain pure.

---

## 5. Consequences
* **Positive**: Centralised registry configuration in `src/config/container.js`. Controllers and services depend on abstractions (constructor arguments), simplifying testing.
* **Negative**: Introduces minor overhead of container wiring at boot time.
