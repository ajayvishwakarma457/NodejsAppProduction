# TypeScript (Intermediate) Reference Guide

This document describes how to configure, structure, and code TypeScript in a Node.js production application, detailing Types, Interfaces, Enums, Generics, `tsconfig.json` configurations, typed Express apps, and type-safe environment variable parsing with Zod.

---

## 1. tsconfig.json Setup for Node.js

The `tsconfig.json` file configures the TypeScript compiler behavior.

```json
{
  "compilerOptions": {
    "target": "es2022",                          /* Set JavaScript language version */
    "module": "commonjs",                        /* Specify module code generation */
    "lib": ["es2022"],                           /* Specify library files to be included */
    "allowJs": true,                             /* Allow JavaScript files to be compiled */
    "outDir": "./dist",                          /* Redirect output structure to the directory */
    "rootDir": "./src",                          /* Specify the root directory of input files */
    "strict": true,                              /* Enable all strict type-checking options */
    "noImplicitAny": true,                       /* Raise error on expressions and declarations with an implied 'any' type */
    "strictNullChecks": true,                    /* Enable strict null checks */
    "moduleResolution": "node",                  /* Resolve modules using Node.js style */
    "types": ["node"],                           /* Type declaration files to be included in compilation */
    "esModuleInterop": true,                     /* Enables emit interoperability between CommonJS and ES Modules */
    "skipLibCheck": true,                        /* Skip type checking of declaration files */
    "forceConsistentCasingInFileNames": true    /* Disallow inconsistently-cased references to the same file */
  },
  "include": ["src/**/*"]
}
```

---

## 2. Core Types, Interfaces, Enums & Generics

### Types vs Interfaces
* **Interface**: Best for defining the shape of an object or class contracts. They are extendable (declaration merging).
* **Type Alias**: Can define primitive types, union types, intersection types, and tuples. Cannot be reopened for merging.

```typescript
// Interface
interface User {
  readonly id: number;
  name: string;
  email?: string; // Optional property
}

// Type intersection
type AdminUser = User & {
  permissions: string[];
};
```

### Enums
Used to define a set of named constants. Can be numeric (default) or string-based.
```typescript
enum UserRole {
  Admin = "ADMIN",
  User = "USER"
}
const currentRole: UserRole = UserRole.Admin;
```

### Generics
Provide a way to create reusable components that work with a variety of types rather than a single one, keeping code type-safe.
```typescript
// Generic Function
function wrapInArray<T>(item: T): T[] {
  return [item];
}

// Generic Interface
interface APIResponse<T> {
  status: number;
  data: T;
}
```

---

## 3. Type-Safe Environment Variables with Zod

By default, `process.env` properties are typed as `string | undefined`. We use Zod to validate and parse env configurations into a type-safe object at runtime.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)), // Parses to number
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url()
});

export const env = envSchema.parse(process.env);
// env.PORT is typed as number
// env.NODE_ENV is restricted to the Enum values
```

---

## 4. Typed Express with @types/express

Importing types from `@types/express` ensures Request Handlers, Requests, Responses, and Errors are type-safe.

```typescript
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';

const app = express();

// RequestHandler type enforces correct signature
const logger: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`${req.method} ${req.path}`);
  next();
};

// Generic type safety for Request Body validation middleware
const userBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
});

function validateBody<T>(schema: z.Schema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    req.body = result.data; // Assigns validated and parsed data
    next();
  };
}

app.post('/users', validateBody(userBodySchema), (req: Request, res: Response): void => {
  const { name, email } = req.body; // Inferred types: string
  res.status(201).json({ name, email });
});
```
