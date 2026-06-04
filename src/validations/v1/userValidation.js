const { z } = require('zod');

// Schema for user ID validation inside request parameters
const userIdParamSchema = z.string().regex(/^\d+$/, { message: "User ID must be a numeric string" }).transform(Number);

const userValidation = {
  // POST /api/v1/users
  createUser: z.object({
    body: z.object({
      name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
      email: z.string({ required_error: "Email is required" }).email("Invalid email format")
    })
  }),

  // GET or DELETE /api/v1/users/:id
  getUserById: z.object({
    params: z.object({
      id: userIdParamSchema
    })
  }),

  // PUT /api/v1/users/:id
  updateUser: z.object({
    params: z.object({
      id: userIdParamSchema
    }),
    body: z.object({
      name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters").optional(),
      email: z.string().email("Invalid email format").optional()
    }).refine(data => data.name || data.email, {
      message: "At least one field (name or email) must be provided for updates"
    })
  })
};

module.exports = userValidation;
