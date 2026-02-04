---
name: prisma-query
description: Write optimized Prisma database queries with proper error handling
requires: [prisma, typescript]
agent: Backend-Agent
---

# Prisma Query Skill

Use this skill when writing database queries with Prisma ORM.

## Query Pattern

```typescript
try {
  const result = await prisma.model.findMany({
    where: { /* conditions */ },
    include: { /* relations */ },
    orderBy: { /* ordering */ }
  });
  return result;
} catch (error) {
  logger.error('Query failed', error);
  throw new DatabaseError('Failed to fetch records');
}
```

## Best Practices
- Always wrap queries in try/catch
- Use proper TypeScript types from Prisma client
- Include related data with `include` when needed
- Add indexes for frequently queried fields
- Use transactions for multi-step operations
