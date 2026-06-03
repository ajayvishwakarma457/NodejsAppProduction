# Databases (Beginner) Reference Guide

This document outlines SQL and NoSQL database fundamentals, schema design, relations, and operations using Prisma ORM (for SQL) and Mongoose ODM (for NoSQL/MongoDB).

---

## 1. SQL (Relational) vs NoSQL (Document) Databases

| Feature | SQL Databases (e.g. PostgreSQL, SQLite) | NoSQL Databases (e.g. MongoDB) |
|---|---|---|
| **Data Model** | Relational tables (rows & columns) | JSON-like documents |
| **Schema** | Rigid, predefined schema | Dynamic, flexible schema |
| **Relations** | Handled using `FOREIGN KEY` constraints and `JOIN`s | Handled using sub-documents or references |
| **Scalability** | Vertical (scale up CPU/RAM) | Horizontal (scale out/shard across servers) |
| **Transactions** | Full ACID (Atomicity, Consistency, Isolation, Durability) | ACID support in modern versions, but design prioritizes speed |

---

## 2. SQL Basics & Relations (Prisma & PostgreSQL/SQLite)

In SQL databases, relations are established using keys.

### Core SQL Operations
* **`SELECT`**: Queries data from a table.
  ```sql
  SELECT * FROM User WHERE email = 'alice@example.com';
  ```
* **`INSERT`**: Adds new rows to a table.
  ```sql
  INSERT INTO User (name, email) VALUES ('Alice', 'alice@example.com');
  ```
* **`JOIN`**: Combines rows from two or more tables based on a related column.
  ```sql
  SELECT User.name, Post.title 
  FROM User 
  INNER JOIN Post ON User.id = Post.authorId;
  ```

### Database Indexes
* **What is it?** A database index is a data structure (usually a B-Tree) that improves the speed of data retrieval operations on a database table.
* **Why use it?** Columns frequently used in `WHERE` clauses, `JOIN` conditions, or `ORDER BY` statements should be indexed. Without an index, the database must perform a "full table scan" (reading every single row in the database).
* **Trade-off**: Indexes slow down write operations (`INSERT`, `UPDATE`, `DELETE`) because the index itself must be updated each time.

---

## 3. SQL Implementation using Prisma ORM

Prisma is a type-safe database toolkit (ORM) that replaces traditional query builders or raw SQL.

### Schema Setup (`prisma/schema.prisma`)
```prisma
model User {
  id    Int     @id @default(autoincrement())
  name  String
  email String  @unique
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId]) // Creates database index on authorId relation key
}
```

### SQL CRUD via Prisma Client
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Create (INSERT)
const user = await prisma.user.create({
  data: { name: 'Alice', email: 'alice@example.com' }
});

// 2. Read (SELECT)
const users = await prisma.user.findMany({
  where: { name: 'Alice' }
});

// 3. Read with Relationship (JOIN)
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true }
});

// 4. Update (UPDATE)
await prisma.user.update({
  where: { email: 'alice@example.com' },
  data: { name: 'Alice Smith' }
});

// 5. Delete (DELETE)
await prisma.user.delete({
  where: { email: 'alice@example.com' }
});
```

---

## 4. NoSQL Implementation using MongoDB + Mongoose ODM

Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It manages relationships, provides schema validation, and translates code objects into database documents.

### Mongoose Schema Design
NoSQL schemas can either **nest** documents (sub-documents) or **reference** them (normalized documents).

```javascript
const mongoose = require('mongoose');

// Embedded Schema definition
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  createdAt: { type: Date, default: Date.now }
});

// Main Document Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true // Indexing email
  },
  posts: [postSchema] // Array of embedded sub-documents
});

const User = mongoose.model('User', userSchema);
```

### Mongoose CRUD Operations
```javascript
// 1. Create
const newUser = await User.create({
  name: 'Bob',
  email: 'bob@example.com',
  posts: [{ title: 'Intro to NoSQL' }]
});

// 2. Read
const users = await User.find({ name: 'Bob' });

// 3. Update
await User.findOneAndUpdate(
  { email: 'bob@example.com' },
  { $set: { name: 'Robert' } }
);

// 4. Delete
await User.deleteOne({ email: 'bob@example.com' });
```
