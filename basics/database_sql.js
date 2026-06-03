// ==================================================
// SQL Database CRUD & JOINs (SQLite + Prisma Client)
// ==================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("\x1b[35m=== SQL CRUD & JOIN Operations using Prisma ===\x1b[0m\n");

  try {
    // 1. Clean up database (DELETE)
    console.log("\x1b[36m1. Cleaning up database...\x1b[0m");
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("  Database cleared.\n");

    // 2. Insert data (INSERT)
    console.log("\x1b[36m2. Inserting Users and Posts (INSERT)...\x1b[0m");
    const user1 = await prisma.user.create({
      data: {
        name: "Alice Smith",
        email: "alice@prisma.io",
        posts: {
          create: [
            { title: "Prisma with SQLite", content: "SQLite is awesome for local development!" },
            { title: "Node.js Production Guide", content: "Production Node.js is all about stability." }
          ]
        }
      }
    });

    const user2 = await prisma.user.create({
      data: {
        name: "Bob Jones",
        email: "bob@prisma.io",
        posts: {
          create: [
            { title: "Database Indexes Explained", content: "Indexes speed up queries significantly." }
          ]
        }
      }
    });
    console.log(`  Inserted Users: ${user1.name} (ID: ${user1.id}), ${user2.name} (ID: ${user2.id})\n`);

    // 3. Querying data (SELECT)
    console.log("\x1b[36m3. Fetching all users (SELECT)...\x1b[0m");
    const allUsers = await prisma.user.findMany();
    console.log("  All Users:", allUsers, "\n");

    // 4. Joining Relations (SQL JOIN equivalent)
    console.log("\x1b[36m4. Fetching users and including their posts (SQL JOIN)... \x1b[0m");
    const usersWithPosts = await prisma.user.findMany({
      include: {
        posts: true // Joins the Post table
      }
    });
    usersWithPosts.forEach(user => {
      console.log(`  User: ${user.name}`);
      user.posts.forEach(post => {
        console.log(`    - Post: "${post.title}"`);
      });
    });
    console.log("");

    // 5. Updating data (UPDATE)
    console.log("\x1b[36m5. Updating user email (UPDATE)...\x1b[0m");
    const updatedUser = await prisma.user.update({
      where: { email: "alice@prisma.io" },
      data: { email: "alice.smith@prisma.io" }
    });
    console.log(`  Updated User:`, updatedUser, "\n");

    // 6. SQL Filtering & Selection
    console.log("\x1b[36m6. Finding posts written by Bob (Filtered SELECT)...\x1b[0m");
    const bobsPosts = await prisma.post.findMany({
      where: {
        author: {
          name: {
            contains: "Bob"
          }
        }
      },
      select: {
        id: true,
        title: true,
        author: {
          select: { name: true }
        }
      }
    });
    console.log("  Bob's Posts:", bobsPosts, "\n");

  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
