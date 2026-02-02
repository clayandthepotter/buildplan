# BuildPlan Multi-Tenant Architecture

## Overview

BuildPlan is designed as a **horizontally scalable, multi-tenant SaaS platform** capable of supporting tens of thousands of users across thousands of organizations. This document outlines the architectural decisions, patterns, and infrastructure required to achieve this scale while maintaining security, performance, and reliability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                    (AWS ALB / CloudFlare)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼─────────┐            ┌───────▼────────┐
│   Web Tier       │            │   API Tier     │
│  (Next.js SSR)   │            │  (Node.js)     │
│  - Static Assets │            │  - REST API    │
│  - Server Render │            │  - GraphQL     │
│  - Edge Caching  │            │  - WebSocket   │
└──────────────────┘            └────────┬───────┘
                                         │
                         ┌───────────────┴──────────────┐
                         │                              │
                ┌────────▼────────┐          ┌─────────▼─────────┐
                │  Auth Service   │          │   Core Services   │
                │  - JWT          │          │  - Request Mgmt   │
                │  - Session      │          │  - Plan Engine    │
                │  - MFA          │          │  - Workflow       │
                │  - SSO (SAML)   │          │  - Notifications  │
                └─────────────────┘          └──────────┬────────┘
                                                        │
                         ┌──────────────────────────────┼─────────────┐
                         │                              │             │
                ┌────────▼────────┐          ┌─────────▼─────────┐   │
                │  Agent Services │          │  GitHub Bridge    │   │
                │  - Manager      │          │  - Branch/PR      │   │
                │  - Builder      │          │  - Commit/Patch   │   │
                │  - QA           │          │  - Webhooks       │   │
                │  - Docs         │          └───────────────────┘   │
                │  - API Docs     │                                  │
                └─────────┬───────┘                                  │
                          │                                          │
                ┌─────────▼──────────────────────────────────────────▼──┐
                │              Message Queue (Bull/BullMQ)              │
                │  - Agent Jobs Queue (per-tenant isolation)            │
                │  - Priority Queues (Enterprise tier)                  │
                │  - Email Queue                                        │
                │  - Webhook Queue                                      │
                │  - Document Generation Queue                          │
                └────────────────────┬──────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
┌────────▼─────────┐        ┌───────▼────────┐        ┌────────▼─────────┐
│   PostgreSQL     │        │     Redis      │        │   S3 / Object    │
│  - Primary       │        │  - Sessions    │        │     Storage      │
│  - Read Replica  │        │  - Cache       │        │  - Artifacts     │
│  - Row-Level     │        │  - Rate Limit  │        │  - Documents     │
│    Security      │        │  - Pub/Sub     │        │  - Backups       │
└──────────────────┘        └────────────────┘        └──────────────────┘
```

## Core Architectural Principles

### 1. Tenant Isolation

#### Row-Level Security (RLS)
Primary isolation mechanism using PostgreSQL RLS policies:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policy to filter by organization
CREATE POLICY tenant_isolation ON requests
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Application sets context per request
SET LOCAL app.current_organization_id = '<tenant-uuid>';
```

**Benefits**:
- Automatic filtering at database level
- Eliminates accidental cross-tenant queries
- Centralized security enforcement
- Works with all ORMs and query builders

**Pattern for All Tables**:
```typescript
// Middleware sets organization context
app.use((req, res, next) => {
  const orgId = req.session.organizationId;
  req.db = db.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await db.$executeRaw`SET LOCAL app.current_organization_id = ${orgId}`;
          return query(args);
        }
      }
    }
  });
  next();
});
```

#### Data Partitioning Strategy
For high-volume tenants (Enterprise tier):
- **Declarative Partitioning**: Split large tables by organization_id ranges
- **Separate Schemas**: Option for compliance/data residency requirements
- **Dedicated Infrastructure**: Enterprise tier can opt for isolated database instances

### 2. Horizontal Scalability

#### Stateless Application Servers
- No server-side session storage (use Redis or JWT)
- All application state in database or cache
- Enable auto-scaling based on CPU/memory metrics
- Blue-green deployments for zero-downtime updates

#### Connection Pooling
```typescript
// PgBouncer configuration
{
  pool_mode: 'transaction',
  max_client_conn: 10000,
  default_pool_size: 25,
  reserve_pool_size: 5,
  server_lifetime: 3600,
  server_idle_timeout: 600
}
```

#### Read Replicas
- Route read-heavy queries to replicas
- Use Prisma read replicas extension
- Implement eventual consistency handling
- Failover to primary if replica unavailable

### 3. Queue Architecture

#### Per-Tenant Isolation
Prevents "noisy neighbor" problems:

```typescript
// Queue naming: buildplan:{org_id}:{queue_type}
const queueName = `buildplan:${orgId}:agent-jobs`;

// Create queue with tenant-specific settings
const queue = new Queue(queueName, {
  redis: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
```

#### Priority Queues
- **Free Tier**: Standard queue, shared workers
- **Pro Tier**: Higher priority, dedicated worker pool
- **Enterprise Tier**: Highest priority, guaranteed capacity

#### Job Types
1. **Agent Execution Jobs**: Manager, Builder, QA, Docs agents
2. **GitHub Operations**: Branch creation, commits, PR operations
3. **Notification Jobs**: Email, in-app, webhooks
4. **Document Generation**: PDF reports, exports
5. **Billing Jobs**: Usage aggregation, invoice generation

### 4. Caching Strategy

#### Redis Cache Layers

**Session Cache** (Short TTL: 1 hour):
```typescript
// User sessions with organization context
cache.set(`session:${sessionId}`, {
  userId,
  organizationId,
  roles,
  permissions
}, { ttl: 3600 });
```

**Data Cache** (Medium TTL: 5 minutes):
```typescript
// Frequently accessed data
cache.set(`org:${orgId}:settings`, orgSettings, { ttl: 300 });
cache.set(`user:${userId}:orgs`, userOrganizations, { ttl: 300 });
```

**Rate Limit Cache** (Short TTL: 1 minute):
```typescript
// API rate limiting
const key = `rate:${orgId}:${endpoint}:${minute}`;
const count = await cache.incr(key);
await cache.expire(key, 60);
```

**Invalidation Strategy**:
- Event-driven cache invalidation
- Pub/Sub for multi-instance coordination
- Cache versioning for schema changes

## Data Model

### Core Multi-Tenant Entities

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Subscription & Billing
  subscription   Subscription?
  usage          Usage[]
  
  // Members & Access
  members        OrganizationMember[]
  invitations    Invitation[]
  
  // Data
  users          User[]
  requests       Request[]
  workspaces     Workspace[]
  
  // Settings
  settings       Json
  features       Json
  limits         Json
  
  @@index([slug])
}

model OrganizationMember {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  role           Role     @default(MEMBER)
  createdAt      DateTime @default(now())
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, userId])
  @@index([userId])
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  passwordHash  String
  emailVerified Boolean  @default(false)
  mfaEnabled    Boolean  @default(false)
  mfaSecret     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Multi-org membership
  memberships   OrganizationMember[]
  
  @@index([email])
}

model Subscription {
  id             String   @id @default(uuid())
  organizationId String   @unique
  tier           Tier     @default(FREE)
  status         SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  // Stripe
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  
  // Limits (overrides default tier limits)
  customLimits   Json?
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
}

model Usage {
  id             String   @id @default(uuid())
  organizationId String
  period         DateTime // Start of billing period
  
  // Tracked metrics
  requestsCreated    Int @default(0)
  agentMinutes       Int @default(0)
  storageGB          Float @default(0)
  apiCalls           Int @default(0)
  githubOperations   Int @default(0)
  
  updatedAt      DateTime @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, period])
  @@index([organizationId])
}

// All tenant-scoped tables include:
model Request {
  id             String   @id @default(uuid())
  organizationId String   // Required for RLS
  // ... other fields
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])
}
```

### Row-Level Security Policies

Apply to all tenant-scoped tables:

```sql
-- Requests
CREATE POLICY tenant_isolation_requests ON requests
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Plans
CREATE POLICY tenant_isolation_plans ON plans
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Tasks
CREATE POLICY tenant_isolation_tasks ON tasks
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Apply to all tenant-scoped tables...
```

## Security Architecture

### Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │   Auth   │
│          │                                    │  Service │
└────┬─────┘                                    └─────┬────┘
     │                                                │
     │  1. POST /auth/login                          │
     │  { email, password }                          │
     ├──────────────────────────────────────────────►│
     │                                                │
     │  2. Verify credentials                        │
     │     & check MFA if enabled                    │
     │                                                │
     │  3. Return JWT + Organizations list           │
     │◄───────────────────────────────────────────────┤
     │  { token, organizations: [...] }              │
     │                                                │
     │  4. POST /auth/switch-org                     │
     │  { organizationId }                           │
     ├──────────────────────────────────────────────►│
     │                                                │
     │  5. Verify membership & permissions           │
     │                                                │
     │  6. Return new JWT with org context           │
     │◄───────────────────────────────────────────────┤
     │  { token, organization, roles }               │
     │                                                │
```

### Authorization Model

#### Roles & Permissions

```typescript
enum Role {
  OWNER      // Full control, billing, delete org
  ADMIN      // Manage members, settings, all features
  MANAGER    // Create requests, manage plans, view all
  MEMBER     // Create requests, view assigned work
  VIEWER     // Read-only access
}

// Permission matrix
const permissions = {
  OWNER: ['*'],
  ADMIN: [
    'org.settings.*',
    'org.members.*',
    'requests.*',
    'plans.*',
    'agents.*'
  ],
  MANAGER: [
    'requests.*',
    'plans.read',
    'plans.update',
    'tasks.read'
  ],
  MEMBER: [
    'requests.create',
    'requests.read',
    'tasks.update'
  ],
  VIEWER: [
    'requests.read',
    'plans.read',
    'tasks.read'
  ]
};
```

### API Security

#### Rate Limiting

```typescript
// Per-tenant rate limits
const rateLimits = {
  FREE: {
    requests: 100,    // per hour
    agents: 10,       // concurrent
    api: 1000         // per hour
  },
  PRO: {
    requests: 1000,
    agents: 50,
    api: 10000
  },
  ENTERPRISE: {
    requests: -1,     // unlimited
    agents: 200,
    api: 100000
  }
};

// Redis-based rate limiter
async function checkRateLimit(orgId: string, endpoint: string) {
  const key = `rate:${orgId}:${endpoint}:${getCurrentHour()}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  
  const limit = await getOrgRateLimit(orgId, endpoint);
  return count <= limit;
}
```

## Scaling Strategy

### Horizontal Scaling Targets

| Component | Free Tier | Pro Tier | Enterprise |
|-----------|-----------|----------|------------|
| Web Servers | 2 | 4 | 8+ |
| API Servers | 2 | 6 | 12+ |
| Worker Instances | 2 | 4 | 8+ |
| Redis Nodes | 1 | 3 (cluster) | 6 (cluster) |
| DB Connections | 100 | 500 | 2000+ |

### Database Scaling

#### Vertical Scaling (Initial)
- Start: db.t3.large (2 vCPU, 8GB RAM)
- Growth: db.r5.xlarge (4 vCPU, 32GB RAM)
- Scale: db.r5.4xlarge (16 vCPU, 128GB RAM)

#### Horizontal Scaling (Advanced)
1. **Read Replicas**: 2-4 replicas for read-heavy queries
2. **Connection Pooling**: PgBouncer layer (10,000 connections → 200 database connections)
3. **Partitioning**: Partition large tables by organization_id
4. **Sharding** (Future): Separate database clusters per region

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| API Response Time (p95) | < 200ms | > 500ms |
| Database Query Time (p95) | < 50ms | > 200ms |
| Agent Job Queue Time | < 30s | > 5min |
| Cache Hit Rate | > 80% | < 50% |
| Database CPU | < 70% | > 90% |
| Worker Queue Depth | < 100 | > 1000 |

## Deployment Architecture

### Infrastructure Stack

```yaml
Production:
  Region: Multi-region (US-East, EU-West)
  Load Balancer: AWS ALB + CloudFlare
  Compute: ECS Fargate (containerized)
  Database: AWS RDS PostgreSQL (Multi-AZ)
  Cache: AWS ElastiCache Redis (Cluster Mode)
  Storage: AWS S3 (versioned, encrypted)
  Secrets: AWS Secrets Manager
  Monitoring: DataDog / Prometheus + Grafana
  Logging: ELK Stack / CloudWatch
  CI/CD: GitHub Actions → AWS ECR → ECS
```

### Container Architecture

```dockerfile
# API Service
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]

# Health: GET /health
# Metrics: GET /metrics
# Replicas: 4-12 (auto-scaling)
```

## Monitoring & Observability

### Key Metrics

#### Application Metrics
- Request rate (per organization)
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Agent job processing time
- Queue depths and lag

#### Infrastructure Metrics
- CPU, Memory, Disk usage
- Database connections, query performance
- Redis hit/miss ratio
- Network throughput

#### Business Metrics
- Active organizations
- Requests created (per tier)
- Agent minutes consumed
- Conversion events (Free → Pro → Enterprise)

### Alerting Thresholds

```yaml
Critical:
  - API error rate > 5%
  - Database CPU > 90%
  - Queue depth > 1000
  - Response time p95 > 1s

Warning:
  - API error rate > 2%
  - Database CPU > 70%
  - Queue depth > 500
  - Response time p95 > 500ms
```

## Disaster Recovery

### Backup Strategy
- **Database**: Automated daily backups, 30-day retention
- **Point-in-Time Recovery**: 5-minute granularity
- **Cross-Region Replication**: Critical data replicated to DR region
- **Object Storage**: Versioned with lifecycle policies

### Recovery Objectives
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 5 minutes

---

**Last Updated**: 2026-02-02  
**Status**: Architecture Design Phase
