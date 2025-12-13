## JWT Verification

Every downstream service that consumes JWTs issued by the **Identity Service** MUST implement JWKS-based verification according to this specification.

---

## 1. JWKS Fetching

* Downstream services MUST fetch JWKS from:

```
{IDENTITY_SERVICE_URL}/.well-known/jwks.json
```

* Public keys MUST NOT be hard-coded.
* JWKS retrieval MUST be performed:

  * At service startup
  * On a fixed TTL schedule

---

## 2. JWKS Caching Strategy

* JWKS MUST be cached locally.
* Cache TTL MUST be configurable via environment variable:

```
JWKS_TTL_IN_MINUTES
```

* Recommended TTL range:

  * **5–10 minutes**

### Cache Rules

* JWKS cache refresh MUST occur:

  * Only when TTL expires
* JWKS cache refresh MUST NOT occur:

  * On JWT verification failure
  * On unknown `kid`
  * On signature mismatch

This rule is mandatory to prevent cache-based DoS attacks.

---

## 3. Verification Flow (Strict)

For **every incoming request**, the downstream service MUST execute the following steps **in order**:

### Step 1: Parse JWT Header

* Extract:

  * `alg`
  * `kid`
* If:

  * `alg` ≠ `RS256`
  * `kid` is missing
    → **Reject with HTTP 401**

### Step 2: Resolve Public Key

* Look up the public key matching `kid` in the **cached JWKS**.
* If no matching key is found:

  * **DO NOT refresh JWKS**
  * **Reject with HTTP 401**

### Step 3: Verify Signature

* Verify the JWT signature using:

  * Resolved public key
  * Algorithm **RS256 only**
* If verification fails:

  * **Reject with HTTP 401**

### Step 4: Validate Claims

The following claims MUST be validated:

* `iss` — must be trusted
* `aud` — must match the service
* `exp` — must not be expired
* `iat` — must be within acceptable skew
* `nbf` — if present, must be valid
* `sub` — must exist

If any validation fails:

* **Reject with HTTP 401**

## 4. Authorization Using Permissions

* The `permissions` claim MUST be present and MUST be an array of strings.
* Authorization decisions MUST rely **exclusively** on the `permissions` claim.
* Downstream services MUST NOT:
  * Query Identity Service for permissions
  * Recompute permissions from roles
  * Cache permissions outside the JWT

JWT is the **single source of truth** for authorization.

## 5. Behavior on Key Rotation

Downstream services MUST assume:

* JWKS may contain **multiple active keys** during rotation.
* Tokens signed with any published key MUST be accepted.
* Tokens signed with removed keys MUST be rejected.

### Rotation Compatibility Guarantee

Key rotation safety is ensured by:

* Overlapping JWKS publication (A → AB → B)
* JWKS TTL-based refresh
* Strict rejection without retry

No runtime coordination is required between services.

---

## 6. Failure Handling

### JWT Invalid

If any verification step fails:

* Return **HTTP 401 Unauthorized**
* Do NOT retry verification
* Do NOT refresh JWKS
* Log the failure for audit purposes

### JWKS Endpoint Unavailable

If JWKS refresh fails during scheduled refresh:

* Continue using cached JWKS (graceful degradation)
* Log warning
* Reject requests only if verification fails with cached keys


