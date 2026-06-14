# API Contract: Authentication

**Base Path**: `/api/auth`

## POST /api/auth/register

Create a new user account.

**Request Body**:
```json
{
  "email": "string (required, RFC 5322, max 255)",
  "password": "string (required, 8+ chars, 1 upper, 1 lower, 1 digit)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 201 | `{ "id": "uuid", "email": "string", "createdAt": "ISO 8601" }` | Account created |
| 400 | `{ "type": "validation", "errors": [...] }` | Validation failure (weak password, invalid email) |
| 409 | `{ "type": "conflict", "detail": "Email already registered" }` | Duplicate email |

---

## POST /api/auth/login

Authenticate and receive token pair.

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "accessToken": "string", "refreshToken": "string", "expiresIn": 3600 }` | Login successful |
| 401 | `{ "type": "authentication", "detail": "Invalid credentials" }` | Bad email or password |

---

## POST /api/auth/refresh

Exchange a valid refresh token for a new token pair.

**Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "accessToken": "string", "refreshToken": "string", "expiresIn": 3600 }` | Tokens rotated |
| 401 | `{ "type": "authentication", "detail": "Invalid or expired refresh token" }` | Token invalid/expired/revoked |

---

## POST /api/auth/logout

Revoke all refresh tokens for the authenticated user.

**Headers**: `Authorization: Bearer <accessToken>`

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 204 | (empty) | All refresh tokens revoked |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
