# Helmet.js — Secure HTTP Headers

Helmet.js is a security-focused middleware collection for Express.js that sets various HTTP response headers to protect applications from common web vulnerabilities. By configuring appropriate security headers, Helmet helps prevent attacks like Cross-Site Scripting (XSS), clickjacking, MIME-type sniffing, and session hijacking.

---

## Why Helmet.js is Critical for Production

HTTP response headers tell the browser how to behave when handling application content. By default, Express applications expose certain headers (like `X-Powered-By: Express`) and lack critical security configurations, making them easy targets.

Helmet.js acts as a shield by injecting a pre-configured suite of 15 smaller middleware functions that set security headers.

---

## Implemented Headers & Their Protections

When you run `app.use(helmet())`, the following key headers are automatically configured and set on all responses:

### 1. Content Security Policy (CSP)
* **Header**: `Content-Security-Policy`
* **Purpose**: Restricts resources (such as JavaScript, CSS, Images) that the browser is allowed to load for a given page.
* **Protection**: Prevents Cross-Site Scripting (XSS) and data injection attacks.

### 2. Strict-Transport-Security (HSTS)
* **Header**: `Strict-Transport-Security`
* **Purpose**: Forces browsers to only connect to the server via secure HTTPS connections rather than HTTP.
* **Protection**: Mitigates Man-in-the-Middle (MitM) attacks and protocol downgrade attacks.

### 3. X-Frame-Options
* **Header**: `X-Frame-Options` (Defaults to `SAMEORIGIN`)
* **Purpose**: Controls whether the application can be embedded within `<frame>`, `<iframe>`, `<embed>`, or `<object>` elements.
* **Protection**: Prevents clickjacking attacks, where an attacker tricks a user into clicking something on another site.

### 4. X-Content-Type-Options
* **Header**: `X-Content-Type-Options` (Set to `nosniff`)
* **Purpose**: Instructs the browser not to bypass/guess the MIME type declared in the `Content-Type` header.
* **Protection**: Mitigates MIME-type sniffing vulnerabilities, preventing files from being executed as scripts if they are uploaded or served with incorrect content types.

### 5. X-DNS-Prefetch-Control
* **Header**: `X-DNS-Prefetch-Control`
* **Purpose**: Controls browser DNS prefetching (resolving domain names before a user clicks a link).
* **Protection**: Enhances user privacy by disabling automatic prefetching.

### 6. X-Download-Options
* **Header**: `X-Download-Options` (Specifically for Internet Explorer 8)
* **Purpose**: Prevents IE from executing downloads in the context of the site.
* **Protection**: Mitigates file execution vulnerabilities.

### 7. X-Permitted-Cross-Domain-Policies
* **Header**: `X-Permitted-Cross-Domain-Policies`
* **Purpose**: Restricts Adobe Flash and PDF documents from loading data across domains.

### 8. Referrer-Policy
* **Header**: `Referrer-Policy` (Defaults to `no-referrer`)
* **Purpose**: Controls how much referrer information is sent in the `Referer` header when navigating to another site.

---

## Integration in Express

Helmet.js is registered as a global middleware at the very top of the stack, before any routes or other middleware are evaluated.

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// Register helmet secure headers middleware at the top of stack
app.use(helmet());
```

---

## Customizing Helmet Options

While the default setup is recommended, Helmet can be configured or specific headers disabled when necessary (e.g., during local testing or when integrating external scripts like Google Analytics or CDNs):

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://trustedscripts.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'same-origin' },
  })
);
```
