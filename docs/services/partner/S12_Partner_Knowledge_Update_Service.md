# Telcenter Partner - Partner Knowledge Update Service (S12)

Introducing the series of Telcenter Engineering.

Telcenter, on the surface, is a semi-automated telecom services call center -
it is a web app that offers telecommunication services consultation. People
are serviced by the AI Agent, and they will be forwarded to in-person
consultants if the AI detected down mood, rage, or that it could not answer
the question itself given a pre-fed ground truth database. Now, we are
designing this as microservices. Telcenter Core would act as the main backend
for the end-user interface, and it consists of multiple microservices.
Telcenter Partner is another system that is deployed separately on each of
the telecom partner's servers, and it is responsible for taking up forwarded
conversations and continuing them with the real persons in-charge. Together,
one Core and several Partner systems cooperate to deliver the best customer
experience, while lowering cost dramatically, with the help of automated AI
responses.

The general deployment and communication topology is like this:

    Core <---(Internet)---> (Partner_1, Partner_2..., Partner_N)

The users' inquiries and answers to those are primarily in Vietnamese.

Now, you are designing the **Partner Knowledge Update Service** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **Partner Knowledge Update Service** service may interact with:

- **S11 Partner Local Knowledge Service**: Manages partner-specific telecom knowledge database and handles local queries
- **S05 Knowledge Validator Service (Core)**: Core service that validates knowledge updates before they are approved and distributed
- **S14 Partner Metrics Service**: Reports processing metrics and performance statistics

## A Note on API Transport Layers

The APIs of the services (including this one
and the peers) might be based on HTTP and/or
RabbitMQ transport protocols. One service might
also exposes multiple APIs of different kinds.

HTTP is mostly used in APIs that are exposed
to the frontend web apps, though it occasionally
is used for internal communication between
microservices, too. HTTP APIs are somewhat
RESTful (it is CRUD, stateless, versioned,
and HATEOAS, but it need not follow
Code-on-Demand requirements.)

For APIs that are based on RabbitMQ transport,
each API usually demands two queues, the
requests queue and the responses queue. The
caller would send requests into the former queue
and expect the responses to come out from the
latter. Exceptions will be explicitly noted.
The default queue names will be specified for
each such API. The queue names should be configurable
via `.env`, too.

## Peer Service APIs

Note that the base URL to call the services
must be specified via `.env`. Construct
a `.env.example` file for that.

### S05 Knowledge Validator Service (Core)

[A34](../../api_groups/A34.md) - Send knowledge updates to Core for validation

### S11 Partner Local Knowledge Service

[A33](../../api_groups/A33.md) - Send validated knowledge updates to S11 for local storage

### S14 Partner Metrics Service

[A16](../../api_groups/A16.md) - Report knowledge update submission metrics to S14

## The Flow

### Flow 1: Submit Knowledge Update (from H29)

1. **Receive Update Request** (via H29): Partner Portal submits a knowledge update request containing new or modified telecom service information (could be manually entered or from processed file imports)

2. **Authenticate Request**: Verify the requesting partner employee's credentials and permissions

3. **Validate Input Format**: Check that the knowledge data is properly structured (dataframe format with required fields)

4. **Forward to Core Validation** (via A34): Send the knowledge update to S05 Knowledge Validator Service in Telcenter Core for validation

5. **Receive Validation Result** (via A34 response): Get validation status from Core (success/failure with reasons)

6. **On Validation Success - Update Local Knowledge** (via A33): If validated successfully, send the approved knowledge to S11 to update Partner Local Knowledge DB

7. **Receive Update Confirmation** (via A33 response): Get acknowledgment from S11 that local knowledge has been updated

8. **Send Metrics** (via A16): Report update metrics to S14 Partner Metrics Service

9. **Return Status to Portal**: Send final status back to Partner Portal with validation/update results

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes the following APIs:

- [H29](../../api_groups/H29.md) - HTTP API for Partner Portal to submit knowledge updates

## Technology

- Python
- Use `uv` as the virtual environment and package manager.
- Multithreaded logic should be used for performance, since this
    component relies a lot on other services, which means the API calls
    to those services take up very much time. So this service is I/O bound.
    Note that, using multithreading to emulate async operations is very
    important - but do NOT use `async` and `await` in Python - that would
    be a mess!

- The class `MessageQueueService` must be used for RabbitMQ communication (which internally
    use `pika`).

    The class is [located in this file](../../../app/services/MessageQueueService.py).

    An example of using this class [is given here](../../MessageQueueService-usage-example.py).

    Also, for multithreading, only use the scheme in that file.
    Any other use of multithreading, if necessary, must strictly
    look for hazards - use locks and other synchronization primitives
    where appropriate.

- If this service needs to expose HTTP API(s), use Flask.

- The program entry point is [in this file](../../../app/__main__.py).

- Use transaction management to ensure consistency between Core validation and local updates
- Implement retry logic for communication with Core services over the Internet

## Database Schema (MongoDB)

Database: `telcenter_partner_s12`

Collections:

- `update_drafts`
    - Purpose: store partner-created drafts before submission to Core
    - Fields:
        - `_id` (ObjectId)
        - `draft_id` (string)
        - `partner_id` (string)
        - `proposer_id` (string)
        - `changes` (array/object) - proposed record changes
        - `status` (string) - `draft` | `submitted` | `withdrawn`
        - `file_reference` (object|null) - SeaweedFS reference if draft came from file
        - `created_at`, `updated_at`
    - Indexes: `{partner_id:1}`, `{status:1}`

- `update_submissions`
    - Purpose: track submissions sent to Core (S05)
    - Fields:
        - `_id`, `submission_id`, `draft_id`, `core_request_id`, `core_response`, `core_validation_status`, `sent_at`, `response_at`
    - Indexes: `{submission_id:1}`, `{core_validation_status:1}`

- `audit_logs`
    - Purpose: store action logs for compliance and traceability
    - Fields: `_id`, `actor_id`, `action`, `target_id`, `details`, `timestamp`

Sample `update_submissions` document:

```json
{
    "submission_id": "sub_20251208_001",
    "draft_id": "draft_1001",
    "core_request_id": "req_abc123",
    "core_validation_status": "pending",
    "sent_at": "2025-12-08T11:00:00Z"
}
```
