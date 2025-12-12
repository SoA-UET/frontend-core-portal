# Telcenter Core - **S07: Partner Management Service**

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

Now, you are designing the **S07: Partner Management Service** service, in Python.
This service is inside the **Telcenter Core** system.

Here are the peer services that the **S07: Partner Management Service** service may interact with. We will come up
with the flow of this service itself later.

- **Partner General Information Service (S09)**: This service is deployed on each Partner system and provides general information, capabilities, and connection verification. S07 calls S09 to verify partner connections and retrieve partner capabilities when needed.
- **Authorized Partner Gateway Service (S16)**: This Partner Gateway acts as the gateway on Partner systems. Partner Gateway calls S07 via RabbitMQ to query partner endpoint information and list active partners for routing purposes.
- **Core Portal**: This is the administrative web interface for Telcenter Core system. Core administrators use this portal to manage partner connections. The Core Portal calls S07 via HTTP REST API (H24) to create, update, and delete partner connections. All partner management operations (TC-03.1, TC-03.2, TC-03.3) are initiated from this portal.

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

Note that the base URL to call the services
must be specified via `.env`. Construct
a `.env.example` file for that.

## The Flow

Based on the APIs' behaviors.

## This Service's APIs

[H11](../../api_groups/H11.md)

[H24](../../api_groups/H24.md)

[A09](../../api_groups/A09.md)

[A07](../../api_groups/A07.md)

[A37](../../api_groups/A37.md)

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

## Database Schema

Database: `telcenter_partner_core`

### Table: `partner`

Lưu trữ thông tin kết nối của các Partner telecom. Đây là bảng chính cho việc quản lý partner.

- `id` (ObjectId, Primary Key): ID định danh nhà mạng
- `name` (string, Unique): Tên nhà mạng (VD: Vinaphone, Viettel)
- `api_key` (string): API key để xác thực API
- `base_url` (string): Endpoint API của hệ thống Partner
- `created_at` (datetime): Thời gian tạo
- `updated_at` (datetime): Thời gian cập nhật gần nhất
