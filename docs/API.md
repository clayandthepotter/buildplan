# BuildPlan API Documentation

**Version**: 0.1.0  
**Base URL**: `https://api.buildplan.dev/v1`  
**Status**: Design Phase - API endpoints are planned but not yet implemented

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Organizations](#organizations)
  - [Requests](#requests)
  - [Plans](#plans)
  - [Tasks](#tasks)
  - [Agents](#agents)
  - [Documents](#documents)
  - [GitHub Integration](#github-integration)
- [Webhooks](#webhooks)
- [Data Types](#data-types)

---

## Authentication

All API requests require authentication using a JWT bearer token or API key.

### Bearer Token Authentication

```http
Authorization: Bearer <jwt_token>
```

### API Key Authentication

```http
X-API-Key: <api_key>
```

### Organization Context

Multi-tenant operations require organization context:

```http
X-Organization-ID: <organization_uuid>
```

---

## Rate Limiting

Rate limits vary by subscription tier:

| Tier | Requests/Hour | Concurrent Agents | API Calls/Day |
|------|---------------|-------------------|---------------|
| Free | 100 | 10 | 1,000 |
| Pro | 1,000 | 50 | 10,000 |
| Enterprise | Unlimited | 200 | 100,000 |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1643760000
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "req_abc123xyz"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Endpoints

### Authentication Endpoints

#### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "organization": {
    "id": "org_xyz789",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "role": "OWNER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### POST /auth/login

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "mfaCode": "123456"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "organizations": [
    {
      "id": "org_xyz789",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "OWNER"
    }
  ]
}
```

---

#### POST /auth/switch-org

Switch active organization context.

**Request Body:**
```json
{
  "organizationId": "org_xyz789"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "organization": {
    "id": "org_xyz789",
    "name": "Acme Corp",
    "role": "ADMIN",
    "permissions": ["requests.*", "plans.*"]
  }
}
```

---

### Organizations

#### GET /organizations

List all organizations for the authenticated user.

**Response (200):**
```json
{
  "organizations": [
    {
      "id": "org_xyz789",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "OWNER",
      "subscription": {
        "tier": "PRO",
        "status": "active"
      },
      "memberCount": 12,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

#### POST /organizations

Create a new organization.

**Request Body:**
```json
{
  "name": "New Company",
  "slug": "new-company"
}
```

**Response (201):**
```json
{
  "organization": {
    "id": "org_new123",
    "name": "New Company",
    "slug": "new-company",
    "role": "OWNER",
    "subscription": {
      "tier": "FREE",
      "status": "active"
    },
    "createdAt": "2026-02-02T19:00:00Z"
  }
}
```

---

#### GET /organizations/:id

Get organization details.

**Response (200):**
```json
{
  "organization": {
    "id": "org_xyz789",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "settings": {
      "timezone": "America/New_York",
      "workweek": [1, 2, 3, 4, 5]
    },
    "subscription": {
      "tier": "PRO",
      "status": "active",
      "currentPeriodEnd": "2026-03-01T00:00:00Z"
    },
    "usage": {
      "requestsCreated": 45,
      "requestsLimit": 500,
      "agentMinutes": 120,
      "storageGB": 2.5
    },
    "limits": {
      "maxMembers": 50,
      "maxWorkspaces": -1
    },
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### Requests

#### POST /requests

Create a new request (project intake).

**Request Body:**
```json
{
  "title": "Add user dashboard",
  "intake": {
    "whatShouldChange": "Users need a dashboard to view their activity",
    "whoIsItFor": "CUSTOMERS",
    "whyItMatters": ["IMPROVES_EXPERIENCE", "SAVES_TIME"],
    "requestType": "NEW_THING",
    "doneMeans": [
      "Can complete task end-to-end",
      "Works on phone and desktop",
      "Fast enough (under 1s)"
    ],
    "deadline": "2026-03-15",
    "deadlineReason": "CUSTOMER_PROMISE",
    "tradeoff": "SMALLER_VERSION_SOONER"
  }
}
```

**Response (201):**
```json
{
  "request": {
    "id": "req_abc123",
    "organizationId": "org_xyz789",
    "title": "Add user dashboard",
    "status": "NEEDS_INFO",
    "readiness": {
      "status": "RISKY",
      "score": 0.65,
      "missingInfo": ["Design mockups needed", "API endpoints undefined"]
    },
    "createdAt": "2026-02-02T19:05:00Z",
    "createdBy": "usr_abc123"
  }
}
```

---

#### GET /requests

List all requests in the organization.

**Query Parameters:**
- `status` - Filter by status (DRAFT, NEEDS_INFO, READY, BUILDING, CHECKING, RELEASING, DONE, PAUSED)
- `assignedTo` - Filter by assignee user ID
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response (200):**
```json
{
  "requests": [
    {
      "id": "req_abc123",
      "title": "Add user dashboard",
      "status": "BUILDING",
      "priority": "HIGH",
      "assignedTo": {
        "id": "usr_def456",
        "name": "Jane Engineer"
      },
      "plan": {
        "milestones": 4,
        "tasksCompleted": 8,
        "tasksTotal": 15
      },
      "createdAt": "2026-02-02T19:05:00Z",
      "updatedAt": "2026-02-02T19:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### GET /requests/:id

Get request details.

**Response (200):**
```json
{
  "request": {
    "id": "req_abc123",
    "organizationId": "org_xyz789",
    "title": "Add user dashboard",
    "status": "BUILDING",
    "intake": { /* full intake data */ },
    "scopeContract": {
      "goal": "Enable users to view their activity at a glance",
      "whoFor": "Customers (all roles)",
      "whyItMatters": "Improves user experience and saves time",
      "included": [
        "Activity feed with last 30 days",
        "Quick stats cards",
        "Mobile responsive layout"
      ],
      "notIncluded": [
        "Custom date range filtering",
        "Export to PDF"
      ],
      "doneMeans": [
        "Users can view activity feed",
        "Dashboard loads under 1s",
        "Works on mobile and desktop"
      ],
      "assumptions": ["Users are already logged in"],
      "risks": ["API performance under load"]
    },
    "plan": { /* plan details */ },
    "timeline": {
      "estimatedStart": "2026-02-03",
      "estimatedEnd": "2026-02-20",
      "confidence": 0.75
    },
    "createdAt": "2026-02-02T19:05:00Z",
    "createdBy": { /* user details */ }
  }
}
```

---

### Plans

#### GET /requests/:requestId/plan

Get the execution plan for a request.

**Response (200):**
```json
{
  "plan": {
    "id": "plan_xyz789",
    "requestId": "req_abc123",
    "milestones": [
      {
        "id": "mile_001",
        "name": "Clarify",
        "status": "COMPLETED",
        "tasks": [
          {
            "id": "task_001",
            "title": "Generate scope contract",
            "status": "DONE",
            "assignedTo": "agent_manager",
            "completedAt": "2026-02-02T19:10:00Z"
          }
        ]
      },
      {
        "id": "mile_002",
        "name": "Build",
        "status": "IN_PROGRESS",
        "tasks": [
          {
            "id": "task_002",
            "title": "Implement dashboard API endpoint",
            "status": "IN_PROGRESS",
            "assignedTo": "usr_def456",
            "dependencies": [],
            "plannedStart": "2026-02-03",
            "plannedFinish": "2026-02-05"
          }
        ]
      }
    ]
  }
}
```

---

### Tasks

#### GET /tasks

Get tasks assigned to the current user.

**Query Parameters:**
- `status` - Filter by status
- `milestone` - Filter by milestone ID

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "task_002",
      "title": "Implement dashboard API endpoint",
      "description": "Create REST endpoint for dashboard data aggregation",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "requestId": "req_abc123",
      "requestTitle": "Add user dashboard",
      "milestoneId": "mile_002",
      "milestoneName": "Build",
      "dependencies": [],
      "blockers": [],
      "assignedTo": "usr_def456",
      "plannedStart": "2026-02-03",
      "dueDate": "2026-02-05",
      "createdAt": "2026-02-02T19:15:00Z"
    }
  ]
}
```

---

#### PATCH /tasks/:id

Update task status or details.

**Request Body:**
```json
{
  "status": "DONE",
  "evidence": [
    {
      "type": "LINK",
      "url": "https://github.com/org/repo/pull/123",
      "description": "PR implementing dashboard endpoint"
    }
  ],
  "notes": "Implemented with caching for performance"
}
```

**Response (200):**
```json
{
  "task": {
    "id": "task_002",
    "status": "DONE",
    "completedAt": "2026-02-05T14:30:00Z",
    "completedBy": "usr_def456"
  }
}
```

---

### Agents

#### POST /agents/execute

Trigger an agent to execute on a request.

**Request Body:**
```json
{
  "requestId": "req_abc123",
  "agentType": "MANAGER",
  "action": "GENERATE_PLAN",
  "input": {
    "includeTests": true,
    "targetComplexity": "MEDIUM"
  }
}
```

**Response (202):**
```json
{
  "agentRun": {
    "id": "run_abc123",
    "agentType": "MANAGER",
    "status": "QUEUED",
    "requestId": "req_abc123",
    "queuePosition": 3,
    "estimatedStartTime": "2026-02-02T19:40:00Z"
  }
}
```

---

#### GET /agents/runs/:id

Get agent run status and output.

**Response (200):**
```json
{
  "agentRun": {
    "id": "run_abc123",
    "agentType": "MANAGER",
    "status": "COMPLETED",
    "input": { /* input payload */ },
    "output": {
      "plan": { /* generated plan */ },
      "confidence": 0.85,
      "warnings": []
    },
    "startedAt": "2026-02-02T19:38:00Z",
    "completedAt": "2026-02-02T19:39:15Z",
    "durationMs": 75000
  }
}
```

---

### Documents

#### GET /requests/:requestId/docs

Get all documentation for a request.

**Response (200):**
```json
{
  "docs": [
    {
      "id": "doc_overview_001",
      "type": "OVERVIEW",
      "title": "User Dashboard - Overview",
      "status": "PUBLISHED",
      "sections": [
        {
          "title": "What We Built",
          "content": "A real-time activity dashboard...",
          "sources": ["req_abc123", "task_002"],
          "lastUpdated": "2026-02-05T16:00:00Z"
        }
      ],
      "version": 2,
      "publishedAt": "2026-02-05T16:00:00Z"
    }
  ]
}
```

---

### GitHub Integration

#### POST /github/repos

Connect a GitHub repository to the organization.

**Request Body:**
```json
{
  "owner": "acme-corp",
  "repo": "backend-api",
  "defaultBranch": "main",
  "installationId": "12345678"
}
```

**Response (201):**
```json
{
  "repository": {
    "id": "repo_gh_001",
    "owner": "acme-corp",
    "repo": "backend-api",
    "defaultBranch": "main",
    "connected": true,
    "connectedAt": "2026-02-02T19:50:00Z"
  }
}
```

---

## Webhooks

BuildPlan can send webhooks for key events.

### Webhook Events

- `request.created`
- `request.status_changed`
- `plan.approved`
- `task.completed`
- `agent.run_completed`
- `release.deployed`

### Webhook Payload

```json
{
  "event": "request.status_changed",
  "timestamp": "2026-02-02T19:55:00Z",
  "organizationId": "org_xyz789",
  "data": {
    "requestId": "req_abc123",
    "previousStatus": "BUILDING",
    "newStatus": "CHECKING",
    "changedBy": "usr_def456"
  }
}
```

### Webhook Signature

Webhooks include an HMAC signature for verification:

```http
X-BuildPlan-Signature: sha256=abc123def456...
```

---

## Data Types

### Status Enums

**RequestStatus**: `DRAFT`, `NEEDS_INFO`, `READY`, `BUILDING`, `CHECKING`, `RELEASING`, `DONE`, `PAUSED`

**TaskStatus**: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`

**SubscriptionTier**: `FREE`, `PRO`, `ENTERPRISE`

**Role**: `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`

---

**Documentation Version**: 0.1.0  
**Last Updated**: 2026-02-02  
**Status**: Design Phase

> **Note**: This API is currently in the design phase. Endpoints will be implemented incrementally as development progresses. Check CHANGELOG.md for implementation updates.
