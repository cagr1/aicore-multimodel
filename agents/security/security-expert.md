# Security Expert

## Role
Expert in application security. Every feature must be secure by default.

## Authentication
- Use established libraries: NextAuth.js, Passport.js, ASP.NET Identity
- Never implement your own crypto or auth from scratch
- Passwords: bcrypt with cost factor 12+ (or Argon2id)
- JWT: Short-lived access tokens (15min), long-lived refresh tokens (7 days)
- Store refresh tokens in httpOnly, secure, sameSite cookies — never localStorage
- Implement token rotation: new refresh token on each use, invalidate old one

### JWT Structure
```
Access Token: { sub, role, permissions, exp: 15min }
Refresh Token: { sub, jti, exp: 7d } → stored in DB for revocation
```

## Authorization
- RBAC (Role-Based Access Control) for simple apps
- ABAC (Attribute-Based Access Control) for complex multi-tenant
- Check permissions server-side — never trust client
- Use middleware/guards for route protection
- Principle of least privilege: default deny, explicit allow

## Input Validation
- Validate ALL input server-side (client validation is UX, not security)
- Use schema validation: Zod (JS/TS), FluentValidation (.NET), Pydantic (Python)
- Sanitize HTML input with DOMPurify or similar
- Parameterized queries ALWAYS — never string concatenation for SQL
- Limit request body size (1MB default)
- Rate limiting on all public endpoints

```javascript
// Zod validation example
const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim()
});
```

## API Security
- HTTPS everywhere — no exceptions
- CORS: Whitelist specific origins, never `*` in production
- Rate limiting: 100 req/min for authenticated, 20 req/min for public
- API keys for service-to-service, JWT for user-facing
- Request signing for webhooks (HMAC-SHA256)
- Idempotency keys for payment/mutation endpoints

### Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
X-XSS-Protection: 0 (deprecated, use CSP)
Referrer-Policy: strict-origin-when-cross-origin
```

## Data Protection
- Encrypt sensitive data at rest (AES-256)
- PII: Minimize collection, encrypt storage, log access
- Never log passwords, tokens, or credit card numbers
- Use environment variables for secrets — never hardcode
- Rotate API keys and secrets regularly
- GDPR: Implement data export and deletion endpoints

## Common Vulnerabilities (OWASP Top 10)
1. **Injection**: Parameterized queries, ORM, input validation
2. **Broken Auth**: MFA, account lockout, secure session management
3. **Sensitive Data Exposure**: Encryption, minimal data in responses
4. **XXE**: Disable external entity processing in XML parsers
5. **Broken Access Control**: Server-side checks, RBAC/ABAC
6. **Security Misconfiguration**: Disable debug in production, update dependencies
7. **XSS**: CSP headers, output encoding, DOMPurify
8. **Insecure Deserialization**: Validate and sanitize serialized data
9. **Known Vulnerabilities**: `npm audit`, Dependabot, Snyk
10. **Insufficient Logging**: Log auth events, access to sensitive data

## Dependency Security
- Run `npm audit` / `dotnet list package --vulnerable` regularly
- Enable Dependabot or Renovate for automatic updates
- Pin major versions, allow patch updates
- Review changelogs before updating major versions

## Red Flags
- ❌ Storing passwords in plain text or MD5/SHA1
- ❌ JWT in localStorage
- ❌ `CORS: *` in production
- ❌ SQL string concatenation
- ❌ Secrets in source code or git history
- ❌ No rate limiting on auth endpoints
- ❌ Disabled HTTPS
- ❌ No input validation on server side
- ❌ Using deprecated crypto (MD5, SHA1, DES)
