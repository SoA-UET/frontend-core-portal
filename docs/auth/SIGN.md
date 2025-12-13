
## JWT Signing & JWKS Specification

All JWTs issued by the **Identity Service** MUST be signed using the **RS256** algorithm (RSA asymmetric cryptography).
The service MUST sign tokens using a **private key** and expose the corresponding **public keys** via a JWKS endpoint for downstream verification.

---

## 1. JWT Signing Requirements

* All JWTs MUST be signed using **RS256**.
* Each signing key pair MUST be associated with a unique key ID (**`kid`**).

* JWT header MUST include:

  * `alg`: `RS256`
  * `kid`: key ID that corresponds to the private key used to sign this particular JWT

* JWT payload:

  * `sub` — authenticated user ID (customer / employee), string
  * `full_name` — user's full name, string
  * `email` — email address, string
  * `permissions` — array of granted permissions (`Array<string>`)
    
    Example:

    ```json
    ["employee.read", "employee.write", "admin.manage"]
    ```

  * `iat` — issued-at timestamp
  * `exp` — expiration timestamp

The `permissions` claim is the **authoritative source** for authorization decisions in downstream services.

**Note**: Customer Identity service doesn't have `permissions` in JWT.

For Core and Partner Employee Identity services,
the `permissions` in this token are obtained
from the role that the authenticated user has,
at the point of token issuance - see the database
schema of each such service.

## 2. JWKS Endpoint

The Identity Service MUST expose a JWKS endpoint at:

```
GET {BASE_URL}/.well-known/jwks.json
```

Response body format:

```ts
{
  "kid": string, // key ID, UUID-v4
  "kty": string, // key type, must be one of: "RSA"
  "alg": string, // signing algorithm, must be one of: "RS256",
  "public_key": string, // public key to verify JWTs, in PEM format, e.g.
  // -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...\n-----END PUBLIC KEY-----
  "use": string, // must be "sig"
}
```

This JWKS endpoint must publish **all currently active public keys**.
(That is, there could be multiple public keys
in effect at the same time.)

Downstream services retrieve and cache this JWKS to verify JWT signatures.

## 3. Token Issuance Rules

* All newly issued tokens MUST use the **latest active** key pair (i.e. the **last** in the key list).
* The JWT header MUST always reference the correct `kid`.
* Token expiration time is 10 minutes and is configurable via `.env` (using the variable `JWT_EXPIRATION_TIME_IN_MINUTES`).
