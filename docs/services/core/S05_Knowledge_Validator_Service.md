# Telcenter Core - Knowledge Validator Service (S05)

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

Now, you are designing the **Knowledge Validator Service** service, in Python.
This service is inside the **Telcenter Core** system.

Here are the peer services that the **Knowledge Validator Service** service may interact with:

- **S03 Knowledge Service**: Core knowledge database service that stores validated telecom service information
- **S08 Metrics Service**: Collects and analyzes metrics about knowledge validation operations
- **S12 Partner Knowledge Update Service**: Partner service that submits knowledge updates for validation

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

### S03 Knowledge Service

[A08](../../api_groups/A08.md) - Send validated knowledge to S03 for storage and indexing

### S12 Partner Knowledge Update Service

[A34](../../api_groups/A34.md) - Receives knowledge validation requests from S12

## The Flow

This service supports the following use cases:

- TC-05.1: Xem danh sách cập nhật
- TC-05.2: Duyệt bản cập nhật
- TC-05.3: Từ chối bản cập nhật

Also, it must be able to get update drafts
from Partner (S12) before displaying them
to Core employees for approval.

The above could be easily implemented
using CRUD pattern via HTTP APIs.

The following only lists the non-trivial
flows.

### Flow 1: Get an update draft from Partner's S12 (via A34)

Steps:

1. **Begin receiving update snapshot:** S05 receives
   a snapshot transmission initiation event from S12
   via A34 (`snapshot_start`).

2. **Receive data chunks:** S05 receives
   data chunks via A34 (`snapshot_chunk`), and
   reassembles them into the full update draft.

3. **Complete receiving update snapshot:** S05
   receives the snapshot transmission completion event
   from S12 via A34 (`snapshot_stop`).
   It must also make sure that all chunks have
   been received by checking the `total_chunks`
   field in the `snapshot_stop` event.

4. **Store draft in SeaweedFS:** S05 stores the
   reassembled update draft JSON file into SeaweedFS,
   and records a validation task in its database
   with status `pending` (see Database Schema below).

### Flow 2: Validate an update draft (from H22)

Steps:

1. User browses pending update drafts in Core Portal
   (via H22 list endpoint).
2. User selects a pending update draft and clicks
   "Approve" button.
3. Core Portal calls S05 via H22 approve endpoint
   to approve that update draft.
4. S05 calls S03 via A08 to store the validated
   knowledge into Core knowledge database,
   specifying the SeaweedFS file ID of the
   update draft JSON file.
5. S03 responds with success.
6. S05 updates the validation task status to
   `validated` in its database.

## This Service's APIs

This service exposes the following APIs:

- [H22](../../api_groups/H22.md) - HTTP API for Core Portal to submit knowledge for validation
- [A34](../../api_groups/A34.md) - RabbitMQ API to receive knowledge validation requests from S12
  - Request Queue: `core_knowledge_validation_requests`
  - Response Queue: `core_knowledge_validation_responses`

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

- Use machine learning models for content quality validation (Vietnamese NLP)
- Implement rule-based validation engine for data consistency checks
- Use MongoDB for storing validation history and audit logs

## Database Schema (MongoDB)

Database: `telcenter_core_s05`

### Collection: `validation_tasks`

Theo dõi các tác vụ validation và lịch sử.

- `_id` (ObjectId, primary key): ID định danh tác vụ
- `seaweed_file_id` (string): ID file JSON trên SeaweedFS (dữ liệu đầu vào)
- `partner_id` (string, nullable): Partner gửi request (null nếu từ Core Portal)
- `status` (string): `pending` / `validated` / `rejected`
- `validator_id` (string): ID người/service thực hiện validate
- `created_at` (datetime): Thời gian tạo
- `validated_at` (datetime, nullable): Thời gian hoàn thành validate (optional)

Sample document:

```json
{
    "_id": "ObjectId(...)",
    "seaweed_file_id": "3,01234567",
    "partner_id": "viettel_partner_001",
    "status": "validated",
    "validator_id": "validator_jane",
    "created_at": "2025-12-08T10:30:00Z",
    "validated_at": "2025-12-08T10:45:00Z"
}
```
