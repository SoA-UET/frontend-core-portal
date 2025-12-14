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

## The Flows

This service has the following use cases:

- TP-14: Tạo bản cập nhật dữ liệu mới (update)
- TP-15: Xóa bản cập nhật đang ở trạng thái Draft
- TP-16: Gửi bản cập nhật lên Telcenter Core

### Flow 1: Create Knowledge Update (from H29)

This corresponds to TP-14.

Steps:

1. Partner Portal calls H29 to create a new knowledge update draft.
2. S12 calls S11 via A33 to snapshot the current local knowledge data
   into a JSON file stored in SeaweedFS.
3. S11 returns the SeaweedFS file ID to S12.
4. S12 creates a new draft update record in its database,
   referencing the SeaweedFS file ID.
5. S12 returns the draft update details to Partner Portal.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 2: Delete Draft Update (from H29)

This corresponds to TP-15.

This is trivial. In the Update list in Partner Portal,
there simply is a "Delete" button for draft updates.
When clicked, Partner Portal calls H29 to delete
the draft update. S12 then deletes the draft
update record from its database.

### Flow 3: Submit Update to Telcenter Core (from H29)

This corresponds to TP-16.

Steps:

1. User in Partner Portal selects a draft update
   (from a list of available drafts that are
   created beforehand) and clicks "Submit to Core" button.
2. Partner Portal calls S12 via H29 to submit that draft update
   to Telcenter Core for validation.
3. S12 retrieves the corresponding draft update's details from its database.
4. S12 calls S05 Knowledge Validator Service (Core) via A34 to submit the update for validation.
   The update data is fetched from SeaweedFS using the stored file ID,
   then sent to S05 by chunks (see A34).

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

### Collection: `submissions`

Theo dõi các lần submit knowledge lên Core để validate.

| Tên trường | Kiểu dữ liệu | Mô tả |
|------------|--------------|-------|
| `_id` | ObjectId | Primary key |
| `seaweed_file_id` | string | ID file JSON trên SeaweedFS |
| `status` | string | `pending` / `validated` / `rejected` |
| `submitted_at` | datetime | Thời gian gửi lên Core |
| `response_at` | datetime | Thời gian nhận kết quả |
| `result_message` | string | Thông báo kết quả từ Core |

Sample document:

```json
{
    "_id": "ObjectId(...)",
    "seaweed_file_id": "3,01234567",
    "status": "validated",
    "submitted_at": "2025-12-08T11:00:00Z",
    "response_at": "2025-12-08T11:05:00Z",
    "result_message": "Validated successfully"
}
```
