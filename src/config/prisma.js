'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug(`[Prisma Query] ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
});

/**
 * Prisma Db Service — Showcases SQL Injection prevention techniques
 */
class PrismaDbService {
  constructor() {
    this.client = prisma;
  }

  /**
   * Safe Parameterized Search using standard Prisma ORM methods.
   * Parameterization is handled automatically by the Prisma engine.
   */
  async findUserByNameSafe(name) {
    return this.client.user.findMany({
      where: {
        name: name, // Automatically parameterized
      },
    });
  }

  /**
   * Safe Raw SQL Search using Prisma's template literal parser.
   * Internally converts template interpolations to SQL parameter markers ($1, $2 or ?) at runtime.
   */
  async findUserByNameRawSafe(name) {
    return this.client.$queryRaw`SELECT * FROM "User" WHERE "name" = ${name}`;
  }

  /**
   * Vulnerable Raw SQL Search using unsafe string interpolation.
   * DO NOT USE THIS IN PRODUCTION. Provided here to demonstrate vulnerable patterns vs secure ones.
   */
  async findUserByNameRawUnsafe(name) {
    logger.warn(`[Security Warning] Executing potentially unsafe raw query: name = ${name}`);
    const query = `SELECT * FROM "User" WHERE "name" = '${name}'`;
    return this.client.$queryRawUnsafe(query);
  }
}

module.exports = new PrismaDbService();
