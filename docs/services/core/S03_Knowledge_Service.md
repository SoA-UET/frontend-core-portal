# Telcenter Core - Knowledge Service (S03)

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

Now, you are designing the **Knowledge Service** service, in Python.
This service is inside the **Telcenter Core** system.

Here are the peer services that the **Knowledge Service** service may interact with:

- **S02 Consultant AI Agent**: The AI agent that handles customer conversations and queries the knowledge base for relevant information
- **S05 Knowledge Validator Service**: Validates and approves knowledge updates before they are stored in the knowledge database
- **S08 Metrics Service**: Queries the knowledge base for analytics and collects metrics about knowledge queries and usage patterns
- **S11 Partner Local Knowledge Service**: Receives metrics from partner services about knowledge queries

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

### S02 Consultant AI Agent

[A01](../../api_groups/A01.md) - Send validated knowledge updates to the AI Agent

### S05 Knowledge Validator Service

[A08](../../api_groups/A08.md) - Receives validated knowledge from S05 for storage

### S08 Metrics Service

[A18](../../api_groups/A18.md) - Report knowledge operations metrics to S08

### S11 Partner Local Knowledge Service

S11 may send partner-local metrics to S03 or to the partner's metrics pipeline; partner metrics are not transported via `A08`.

## The Flow

1. **Receive Validated Knowledge** (via A08): The service receives validated knowledge from S05 Knowledge Validator Service containing telecom service information (packages, pricing, features, etc.)

2. **Store Knowledge**: Store the validated knowledge in the Knowledge Database (vector database + structured database)

4. **Index for Search**: Update search indices and embeddings for efficient retrieval

5. **Send Metrics** (via A08): Report knowledge update metrics to the Metrics Service

6. **Return Success Response**: Acknowledge the successful update to the requesting service

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes the following APIs:

- [A08](../../api_groups/A08.md) - Receives validated knowledge from S05 (RabbitMQ)
  - Request Queue: `knowledge_validator_to_knowledge_requests`
  - Response Queue: `knowledge_validator_to_knowledge_responses`

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

- Use ChromaDB or similar vector database for storing knowledge embeddings
- Use MongoDB for structured telecom service data

## Database Schema (MongoDB)

Database: `telcenter_core_s03`

Collections:

- `knowledge_documents`
    - Purpose: store canonical telecom service documents and records (structured data used by S02 and search)
    - Fields:
        - `_id` (ObjectId)
        - `document_id` (string) - UUID or business id
        - `title` (string)
        - `content` (object) - structured fields, e.g., service_code, price, cycle, description
        - `embeddings_ref` (string|null) - reference to vector embeddings in Chroma or storage
        - `version` (int)
        - `status` (string) - `active` | `deprecated` | `draft`
        - `source` (object) - origin info (partner/core, source_file_reference)
        - `created_by`, `approved_by`, `created_at`, `approved_at`, `updated_at`
    - Indexes:
        - `{document_id: 1}`
        - `{"content.service_code": 1}`
        - `{status:1}`

- `knowledge_versions`
    - Purpose: versioned change history for documents
    - Fields: `_id`, `document_id`, `version`, `changes` (diff), `changed_by`, `changed_at`
    - Indexes: `{document_id:1, version:-1}`

- `knowledge_sources`
    - Purpose: registry of sources (partner, file imports, external feeds)
    - Fields: `_id`, `source_id`, `type` (partner|file|manual), `reference` (e.g., file_reference), `ingested_at`

Sample `knowledge_documents` document:

```json
{
    "_id": "ObjectId(...)",
    "document_id": "doc_service_SD70",
    "title": "Gói cước SD70",
    "content": {"service_code":"SD70","price":70000,"cycle_days":30,"description":"..."},
    "embeddings_ref": "chroma:embedding_doc_service_SD70",
    "version": 3,
    "status": "active",
    "source": {"type":"partner","partner_id":"viettel_partner_001","file_reference":{"storage":"seaweed","file_id":"fid123"}},
    "created_at": "2025-12-08T10:50:00Z"
}
```
