
## JWT Signing & JWKS Specification

All JWTs issued by the **Identity Service** MUST be signed using the **RS256** algorithm (RSA asymmetric cryptography).
The service MUST sign tokens using a **private key** and expose the corresponding **public keys** via a JWKS endpoint for downstream verification.

---

## 1. JWT Signing Requirements

* All JWTs MUST be signed using **RS256 (RSA SHA-256)**.
* Each signing key pair MUST be associated with a unique **`kid`**.
* JWT header MUST include:

  * `alg`: `RS256`
  * `kid`: identifier of the active signing key

### Required JWT Claims

Each issued JWT MUST include at least the following claims:

* `sub` — subject identifier (user / employee ID)
* `name` — display name
* `email` — email address
* `permissions` — array of granted permissions
  Example:

  ```json
  ["employee.read", "employee.write", "admin.manage"]
  ```
* `iat` — issued-at timestamp
* `exp` — expiration timestamp
* `iss` — issuer identifier
* `aud` — intended audience

The `permissions` claim is the **authoritative source** for authorization decisions in downstream services.

**Note**: Customer Identity service doesn't have `permission` in JWT

## 2. JWKS Endpoint

The Identity Service MUST expose a JWKS endpoint at:


```
{BASE_URL}/.well-known/jwks.json
```

### JWKS Requirements

* JWKS MUST publish **all currently active public keys**.
* Each key entry MUST include:

  * `kid`
  * `kty`
  * `alg`
  * `n`
  * `e`
  * `use`: `"sig"`

Downstream services retrieve and cache this JWKS to verify JWT signatures.

## 3. Key Rotation (Overlapping / Staged Rotation)

The Identity Service MUST support both **automatic** and **manual** RSA key rotation.

Key rotation MUST follow an **overlapping publication model** to ensure compatibility with strict JWKS caching in downstream services.

### Rotation Workflow

1. Generate a new RSA key pair.
2. Assign a new unique `kid`.
3. Add the new public key to the JWKS endpoint.
4. Begin issuing new JWTs signed with the new private key.
5. Continue publishing older public keys in JWKS until all tokens signed with them have expired.
6. Remove retired keys from JWKS **only after** all associated tokens are no longer valid.

### Rotation States

* **Phase A**

  * JWKS contains key A
  * Tokens are signed with key A

* **Phase AB**

  * JWKS contains key A and key B
  * New tokens are signed with key B
  * Existing tokens signed with key A remain valid

* **Phase B**

  * JWKS contains key B only
  * Key A is removed after all A-signed tokens have expired

This staged approach guarantees:

* Zero downtime
* No forced synchronization across services
* Safe operation with cached JWKS

## 4. Token Issuance Rules

* All newly issued tokens MUST use the **latest active** RSA key pair.
* The JWT header MUST always reference the correct `kid`.
* Token expiration policy MUST be aligned with downstream JWKS caching behavior.

### Mandatory TTL Alignment Rule

* A signing key MUST remain published in JWKS for at least:

```
Token expiration time + maximum downstream JWKS TTL
```

* This rule is **mandatory** to support downstream services that:

  * Cache JWKS with a fixed TTL
  * Do NOT refresh JWKS in response to JWT verification failures

Failure to comply may result in valid tokens being rejected.

