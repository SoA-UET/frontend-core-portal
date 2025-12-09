# Telcenter Core - **Partner Management Service (S07)**

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

Now, you are designing the **Partner Management Service (S07)** service, in Python.
This service is inside the **Telcenter Core** system.

Here are the peer services that the **Partner Management Service (S07)** service may interact with. We will come up
with the flow of this service itself later.

- **Partner General Information Service (S09)**: This service is deployed on each Partner system and provides general information, capabilities, and connection verification. S07 calls S09 to verify partner connections and retrieve partner capabilities when needed.
- **Authorized Partner Gateway Service (S16)**: This service acts as the gateway on Partner systems. S16 calls S07 via RabbitMQ to query partner endpoint information and list active partners for routing purposes.

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

### **Partner General Information Service (S09)**

S07 calls this service to verify partner connections and retrieve partner capabilities.

[H11 - API between S07 and S09](../../api_groups/H11.md)

This HTTP API provides three endpoints that S07 can call:
- `GET /api/v1/partners/:id` - Retrieve detailed information about a specific partner
- `POST /api/v1/partners/:id/verify-connection` - Verify that a partner connection is active and responding
- `GET /api/v1/partners/:id/capabilities` - Retrieve the list of services and features supported by a partner

The base URL for each partner should be stored in the `partner` table's `base_url` field.
Example configuration in `.env`:
```
# Partner URLs are dynamic, retrieved from database
PARTNER_CONNECTION_TIMEOUT=30
```

### **Authorized Partner Gateway Service (S16)**

S16 calls this service to query endpoint information for routing.

[A09 - API between S16 and S07](../../api_groups/A09.md)

This RabbitMQ API provides methods that S16 calls to discover endpoints:
- `get_partner_endpoint` - Query the endpoint URL of a specific partner by name or ID
- `get_core_endpoint` - Query the endpoint URL of the Core system
- `list_active_partners` - Get a list of all currently active partners with their endpoints

**Default queue names:**
- Request queue: `s16_to_s07_requests` (S16 publishes to this queue)
- Response queue: `s16_to_s07_responses` (S07 publishes responses to this queue)

S07 listens on the request queue and responds on the response queue.

## The Flow

### Flow 1: Create Partner Connection (TC-03.1)

This flow handles the creation of a new partner connection requested from the Core Portal.

1. **Receive HTTP request from Core Portal**: A POST request arrives at `/api/v1/partners` (H24 endpoint) with:
   - `partner_name`: Name of the partner (e.g., "Viettel")
   - `partner_url`: Base URL of the partner's system
   - `otp`: One-time password for authentication

2. **Validate OTP**: Verify the provided OTP against the expected value.
   - If invalid, return error: `"Invalid OTP"`

3. **Check for existing partner**: Query the `partner` table to check if a partner with the same `name` or `base_url` already exists.
   - If duplicate found, return error: `"Partner already exists"`

4. **Test partner connection**: Call the partner's H11 API endpoint `POST {partner_url}/api/v1/partners/:id/verify-connection` to test connectivity.
   - Use HTTP client with timeout settings
   - If connection fails or times out, return error: `"Partner URL unreachable"`

5. **Generate API key**: Create a cryptographically secure API key for authentication between Core and Partner.

6. **Store partner record**: Insert a new record into the `partner` table:
   - `name` = partner_name
   - `public_key` = generated API key
   - `base_url` = partner_url
   - `is_active` = TRUE

7. **Return success response**: Send back partner information including `partner_id`, `api_key`, `created_at`, and `status`.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 2: Update Partner Connection (TC-03.2)

This flow handles updating an existing partner connection.

1. **Receive HTTP request from Core Portal**: A PUT request arrives at `/api/v1/partners/:id` (H24 endpoint) with updated information.

2. **Validate partner existence**: Query the `partner` table with the provided `partner_id`.
   - If not found, return error: `"Partner not found"`

3. **Test new partner URL** (if URL is being updated): Call the new partner URL's verify-connection endpoint.
   - If connection fails, return error: `"Partner URL unreachable"`

4. **Update partner record**: Update the corresponding record in the `partner` table with the new information.

5. **Return success response**: Send back updated partner information.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 3: Delete Partner Connection (TC-03.3)

This flow handles deletion of a partner connection.

1. **Receive HTTP request from Core Portal**: A DELETE request arrives at `/api/v1/partners/:id` (H24 endpoint).

2. **Validate partner existence**: Query the `partner` table with the provided `partner_id`.
   - If not found, return error: `"Partner not found"`

3. **Check for active sessions**: Query the system to check if there are any active conversations or sessions using this partner.
   - If active sessions exist, return error: `"Cannot delete active partner with ongoing sessions"`

4. **Soft delete partner record**: Update the `partner` table, setting `is_active = FALSE` (recommended for audit purposes) or perform hard delete if required.

5. **Return success response**: Send confirmation with `partner_id`, `deleted_at`, and success message.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 4: Handle Endpoint Query Requests (A09 from Gateway)

This flow handles RabbitMQ requests from Partner systems querying for endpoint information.

1. **Listen on RabbitMQ request queue**: The service continuously monitors the A09 request queue for incoming messages from S16 (Partner Gateway).

2. **Receive and parse request**: When a message arrives, extract:
   - `method`: The method name being called
   - `params`: Parameters for the method
   - `id`: Request ID for correlation

3. **Route to appropriate handler**:
   - For `get_partner_endpoint`: Query `partner` table by `partner_identifier` (name or ID), return endpoint information
   - For `get_core_endpoint`: Return Core system endpoint from configuration
   - For `list_active_partners`: Query all records in `partner` table where `is_active = TRUE`

4. **Execute query and build response**:
   - On success: Build response with `status: "success"` and the requested data
   - On error: Build response with `status: "error"` and error message
   - Handle special cases as defined in A09 API specification

5. **Publish response to RabbitMQ**: Send the response message to the A09 response queue with the same correlation `id`.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes two groups of APIs for different consumers:

### **H24 - API for Core Portal**

[H24 - API between Core Portal and S07](../../api_groups/H24.md)

This HTTP API allows Core administrators to manage partner connections:
- `POST /api/v1/partners` - Create a new Telcenter Partner connection (TC-03.1)
- `PUT /api/v1/partners/:id` - Update an existing Telcenter Partner connection (TC-03.2)
- `DELETE /api/v1/partners/:id` - Delete an existing Telcenter Partner connection (TC-03.3)

### **A09 - API for Partner Gateway**

[A09 - API between S16 and S07](../../api_groups/A09.md)

This RabbitMQ API allows Partner systems to query endpoint information:
- `get_partner_endpoint` - Query the endpoint URL of a specific partner by name or ID
- `get_core_endpoint` - Query the endpoint URL of the Core system
- `list_active_partners` - Get a list of all currently active partners with their endpoints

**Default queue names:**
- Request queue: `s16_to_s07_requests`
- Response queue: `s16_to_s07_responses`

These should be configurable via `.env`:
```
A09_REQUEST_QUEUE=s16_to_s07_requests
A09_RESPONSE_QUEUE=s16_to_s07_responses
```

## Database Schema

This service directly interacts with the **Partner Connection DB** database. The main table is `partner`, which stores information about all registered partner connections.

### Table: `partner`

**Storage Location**: Telcenter Core - Partner Connection DB

**Purpose**: Store information about telecom partners and their connection endpoints.

| Tên trường | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
|:-----------|:-------------|:------------------------|:------|
| id | INT | PK, Auto Increment | ID định danh nhà mạng - Unique identifier for each partner |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Tên nhà mạng (VD: Vinaphone, Viettel) - Partner name |
| public_key | VARCHAR(255) | NOT NULL | API key for authentication - Public key for secure communication |
| base_url | VARCHAR(255) | Nullable | Endpoint API của hệ thống Partner - Base URL for partner's API endpoints |
| is_active | BOOLEAN | Default TRUE | Trạng thái hoạt động - Whether the partner connection is active |

**Indexes:**
- Primary key on `id`
- Unique index on `name` (để tránh trùng tên partner)
- Index on `is_active` (để query các partner đang active nhanh hơn)
- Index on `base_url` (để kiểm tra trùng URL)

**Business Rules:**
1. Tên partner (`name`) phải là duy nhất trong hệ thống
2. Không được xóa partner nếu còn active sessions đang sử dụng
3. `base_url` phải được validate định dạng URL hợp lệ
4. `public_key` phải được generate bằng phương pháp cryptographically secure
5. Nên dùng soft delete (set `is_active = FALSE`) thay vì hard delete để giữ audit trail

**Related Tables:**
- Bảng này có thể được reference bởi các bảng khác như `conversations`, `packages`, `faqs` khi cần liên kết với partner cụ thể

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
