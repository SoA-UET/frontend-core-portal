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

### S08 Metrics Service

[A05](../../api_groups/A05.md) - Report validation metrics to S08

### S12 Partner Knowledge Update Service

[A34](../../api_groups/A34.md) - Receives knowledge validation requests from S12

## The Flow

### Flow 1: Validate Knowledge from Core Portal (via H22)

1. **Receive Validation Request** (via H22): Core Portal submits a knowledge validation request from Core employees or automated processes

2. **Authenticate Request**: Verify the requesting user's credentials and validation permissions

3. **Parse Knowledge Data**: Extract and validate the structure of the knowledge dataframe (telecom service information)

4. **Perform Validation Checks**:
   - Check for duplicate entries (compare with existing knowledge in S03)
   - Validate data completeness (all required fields present)
   - Verify data consistency (pricing, package codes, syntax formats)
   - Check for conflicting information
   - Validate Vietnamese language content quality

5. **Send to Knowledge Service** (via A08): If validation passes, forward the validated knowledge to S03 for storage

6. **Receive Storage Confirmation** (via A08 response): Get acknowledgment that knowledge was stored successfully

7. **Report Metrics** (via A05): Send validation metrics to S08 (success/failure rates, validation time, data quality scores)

8. **Return Validation Result**: Send validation status back to Core Portal

### Flow 2: Validate Knowledge from Partner (via A34)

1. **Receive Validation Request** (via A34): S12 Partner Knowledge Update Service sends a knowledge validation request

2. **Identify Partner Source**: Extract partner identity and context from the request

3. **Perform Validation Checks**: Same validation steps as Flow 1, but with partner-specific rules:
   - Verify partner is authorized to update specific service types
   - Check partner-specific data format requirements
   - Validate against partner's service catalog

4. **Send to Knowledge Service** (via A08): If validation passes, forward the validated knowledge to S03

5. **Receive Storage Confirmation** (via A08 response): Get acknowledgment from S03

6. **Report Metrics** (via A05): Send validation metrics to S08 with partner context

7. **Return Validation Result** (via A34 response): Send validation status back to S12

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

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

| Tên trường | Kiểu dữ liệu | Mô tả |
|------------|--------------|-------|
| `_id` | ObjectId | Primary key |
| `seaweed_file_id` | string | ID file JSON trên SeaweedFS (dữ liệu đầu vào) |
| `partner_id` | string/null | Partner gửi request (null nếu từ Core Portal) |
| `status` | string | `pending` / `validated` / `rejected` |
| `validator_id` | string | ID người/service thực hiện validate |
| `result_message` | string | Thông báo kết quả |
| `created_at` | datetime | Thời gian tạo |
| `validated_at` | datetime | Thời gian hoàn thành validate |

Sample document:

```json
{
    "_id": "ObjectId(...)",
    "seaweed_file_id": "3,01234567",
    "partner_id": "viettel_partner_001",
    "status": "validated",
    "validator_id": "validator_jane",
    "result_message": "Validated 15 packages, 20 FAQs successfully",
    "created_at": "2025-12-08T10:30:00Z",
    "validated_at": "2025-12-08T10:45:00Z"
}
```
