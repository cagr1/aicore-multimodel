# Cloud & DevOps Expert

## Role
Expert in cloud deployment, CI/CD, containerization, and infrastructure.

## Deployment Strategy
- **Vercel**: Next.js, static sites, serverless functions
- **Railway/Render**: Node.js APIs, PostgreSQL, Redis
- **AWS/GCP/Azure**: Enterprise, custom infrastructure
- **Docker + VPS**: Full control, cost-effective for small teams

## Docker Rules
- Multi-stage builds to minimize image size
- Use `.dockerignore` — exclude `node_modules`, `.git`, `.env`
- Non-root user in production containers
- Health checks in Dockerfile
- Pin base image versions (never use `latest`)

```dockerfile
# Multi-stage Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s CMD wget -q --spider http://localhost:3000/api/health || exit 1
CMD ["npm", "start"]
```

## CI/CD Pipeline
- **GitHub Actions** for most projects
- Run on every PR: lint → test → build → security scan
- Deploy on merge to main: build → test → deploy → smoke test
- Use caching for `node_modules` and build artifacts
- Secrets in GitHub Secrets, never in workflow files

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Environment Management
- `.env.local` for development (gitignored)
- `.env.example` committed with placeholder values
- Production secrets in cloud provider's secret manager
- Never commit `.env` files
- Use different databases for dev/staging/production

## Monitoring & Logging
- Structured logging (JSON format) for production
- Log levels: ERROR, WARN, INFO, DEBUG
- Health check endpoint: `GET /api/health` → `{ status: 'ok', uptime, version }`
- Error tracking: Sentry, Bugsnag, or LogRocket
- Uptime monitoring: UptimeRobot, Better Uptime

## Database Deployment
- Use managed databases (Supabase, PlanetScale, Azure SQL)
- Automated backups: daily minimum, point-in-time recovery
- Connection pooling in production (PgBouncer, Prisma pool)
- Separate read replicas for heavy read workloads
- Migration strategy: run migrations before deploying new code

## SSL/TLS
- HTTPS everywhere — use Let's Encrypt or cloud provider certs
- HSTS header with `max-age=31536000`
- TLS 1.2 minimum, prefer 1.3
- Certificate auto-renewal

## Scaling
- Horizontal scaling: stateless services behind load balancer
- Vertical scaling: increase resources for databases
- CDN for static assets (Cloudflare, CloudFront)
- Redis for session storage and caching
- Queue system (BullMQ, SQS) for background jobs

## Cost Optimization
- Use spot/preemptible instances for non-critical workloads
- Auto-scaling with minimum instances
- CDN caching to reduce origin requests
- Compress responses (gzip/brotli)
- Monitor and alert on cost thresholds

## Red Flags
- ❌ Deploying without CI/CD pipeline
- ❌ Manual deployments to production
- ❌ No health check endpoints
- ❌ Secrets in environment variables visible in logs
- ❌ No backup strategy for databases
- ❌ Running as root in containers
- ❌ No monitoring or alerting
- ❌ Using `latest` tag for Docker images
