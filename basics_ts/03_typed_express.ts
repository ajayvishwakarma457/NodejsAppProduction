// ==========================================
// 3. Typed Express with @types/express & Zod
// ==========================================

console.log("\x1b[35m=== 3. Typed Express app with schema request validation ===\x1b[0m\n");

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Logger middleware with types
const logger: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`  [TS Log] ${req.method} ${req.path}`);
  next();
};
app.use(logger);

// Zod schemas for validation
const userBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address")
});

const userParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a numeric string").transform(Number)
});

// Middleware for request body validation (Generic schema handler)
function validateBody<T>(schema: z.Schema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }
    // Update req.body with parsed/transformed data
    req.body = result.data;
    next();
  };
}

// Routes
app.post('/users', validateBody(userBodySchema), (req: Request, res: Response): void => {
  // Types are inferred: req.body is { name: string; email: string }
  const { name, email } = req.body;
  console.log(`  POST /users: Creating user ${name} (${email})`);
  res.status(201).json({ success: true, user: { id: 1, name, email } });
});

// GET user with Param Validation
app.get('/users/:id', (req: Request, res: Response): void => {
  const result = userParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const id = result.data.id; // numeric value
  console.log(`  GET /users/:id: Fetching user with ID ${id}`);
  res.json({ id, name: "Alice", email: "alice@example.com" });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error("  [TS Error Handler] Error:", err.message);
  res.status(500).json({ error: err.message });
});

// Spin up server on temporary port
const server = app.listen(3333, () => {
  console.log("  Typed Express App is listening on http://localhost:3333");
  console.log("  (Closing HTTP server immediately for demo purposes)");
  server.close();
});
