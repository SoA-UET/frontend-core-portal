# Telcenter Partner - Partner Local Knowledge Service (S11)

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

Now, you are designing the **Partner Local Knowledge Service** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **Partner Local Knowledge Service** service may interact with:

- **S15 File Importing AI Agent**: AI agent that processes file imports and extracts knowledge from uploaded documents (Excel, PDF, Word files containing telecom service information)
- **S12 Partner Knowledge Update Service**: Service that coordinates knowledge updates and synchronization with Telcenter Core
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

### S15 File Importing AI Agent

[A32](../../api_groups/A32.md) - Send file import requests to the AI agent for processing

### S12 Partner Knowledge Update Service

[A33](../../api_groups/A33.md) - Receives knowledge update commands from S12

### S14 Partner Metrics Service

[A15](../../api_groups/A15.md) - Report local knowledge operations metrics to S14

## The Flow

### Flow 1: Query Knowledge (from H28)

1. **Receive Query Request** (via H28): Partner Portal sends a knowledge query request (search for specific telecom services, pricing, or features)

2. **Authenticate Request**: Verify the requesting partner employee's credentials

3. **Search Local Knowledge Database**: Query the Partner Local Knowledge DB (vector database + structured database) for relevant information

4. **Format Response**: Structure the search results with relevant telecom service data

5. **Report Metrics** (via A15): Send query metrics to S14 Partner Metrics Service

6. **Return Results**: Send the formatted knowledge back to Partner Portal

### Flow 2: Process File Import (triggered via H28)

1. **Receive File Import Request** (via H28): Partner Portal uploads a file (Excel, PDF, Word) containing telecom service knowledge

2. **Validate File**: Check file format, size, and content structure

3. **Forward to AI Agent** (via A32): Send the file to S15 File Importing AI Agent for processing. H28 should first store the uploaded file in SeaweedFS and include a `file_reference` (with `storage: "seaweed"` and `file_id`/`file_url`) in the `A32` message to S15. If `file_content_base64` is provided instead, S15 MUST persist it into SeaweedFS and return a `file_reference`.

4. **Receive Processed Data** (via A32 response): Get structured dataframe from S15 with extracted knowledge

5. **Store Temporarily**: Save the extracted knowledge in a temporary staging area awaiting approval

6. **Report Metrics** (via A15): Send file import metrics to S14

7. **Return Processing Status**: Notify Partner Portal of successful file processing

### Flow 3: Update Knowledge (from S12 via A33)

1. **Receive Knowledge Update** (via A33): S12 sends validated knowledge updates (after Core validation)

2. **Update Local Database**: Store the validated knowledge in Partner Local Knowledge DB

3. **Update Search Indices**: Refresh vector embeddings and search indices for efficient retrieval

4. **Send Metrics** (via A15): Report update metrics to S14 Partner Metrics Service

5. **Return Acknowledgment**: Confirm successful update to S12

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes the following APIs:

- [H28](../../api_groups/H28.md) - HTTP API for Partner Portal to query knowledge and submit file imports
- [A33](../../api_groups/A33.md) - RabbitMQ API to receive knowledge updates from S12
  - Request Queue: `partner_knowledge_update_requests`
  - Response Queue: `partner_knowledge_update_responses`

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
- Use Mongodb for structured telecom service data
- Support file parsing libraries: openpyxl (Excel), PyPDF2 (PDF), python-docx (Word)

## Database Schema (MongoDB)

Database: `telcenter_partner_knowledge`

### Collection: `packages` (Gói cước local)

Lưu thông tin các gói cước viễn thông của Partner này.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | INT | PK, Auto Increment | ID gói cước |
| `partner_id` | INT | FK partners | Gói cước thuộc nhà mạng nào |
| `code` | VARCHAR(50) | Index, Not Null | Mã gói (VD: V120, D500) |
| `meta_data` | TEXT | NOT NULL | String JSON thông tin gói cước |

### Collection: `faqs` (Câu hỏi thường gặp local)

Lưu các câu hỏi và câu trả lời của Partner này.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | INT | PK, Auto Increment | ID câu hỏi |
| `partner_id` | INT | FK partners | Kiến thức này của nhà mạng nào |
| `question` | TEXT | Not Null | Nội dung câu hỏi |
| `answer` | TEXT | Not Null | Nội dung câu trả lời chuẩn |
| `category` | VARCHAR(50) | Nullable | Phân loại (Kỹ thuật, Cước phí...) |

Sample `packages` document:

```json
{
    "id": 1,
    "partner_id": 1,
    "code": "SD70",
    "meta_data": "{\"payment_type\":\"Trả trước\",\"price\":70000,\"cycle_days\":30,\"data_standard_per_day\":1,\"auto_renew\":true,\"registration_syntax\":\"SD70 DK8 gửi 290\"}"
}
```

Sample `faqs` document:

```json
{
    "id": 1,
    "partner_id": 1,
    "question": "Làm sao để kiểm tra số dư?",
    "answer": "Bấm *101# để kiểm tra số dư tài khoản.",
    "category": "Cước phí"
}
```
