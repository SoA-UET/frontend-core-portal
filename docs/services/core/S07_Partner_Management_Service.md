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


## The Flow

### Flow 1: Create Partner Connection (via H24 POST)

1. **Receive Partner Creation Request** (via H24 POST /api/v1/partners): Core Portal submits a request to create a new partner connection with partner_name, partner_url, and OTP for verification

2. **Validate Request Data**: Check that all required fields are present (partner_name, partner_url, OTP)

3. **Check for Duplicate Partner**: Query database to ensure no existing partner with the same name or URL exists
   - If duplicate found: Return error `"Partner already exists"`

4. **Verify OTP**: Validate the provided OTP to authorize the partner registration
   - If OTP is invalid: Return error `"Invalid OTP"`

5. **Test Partner Connection** (via H11 POST /api/v1/partners/:id/verify-connection): Call the partner's S09 service to verify the connection is reachable and responding
   - If connection fails: Return error `"Partner URL unreachable"`

6. **Retrieve Partner Capabilities** (via H11 GET /api/v1/partners/:id/capabilities): Call S09 to get the partner's service capabilities and supported features

7. **Generate API Key**: Create a secure API key for the partner to use when communicating with Core

8. **Store Partner Record**: Save the new partner record to the `partner` table in the database with `is_active` set to `true`

9. **Return Success Response**: Send back the partner details including partner_id, api_key, and creation timestamp

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 2: Update Partner Connection (via H24 PUT)

1. **Receive Partner Update Request** (via H24 PUT /api/v1/partners/:id): Core Portal submits a request to update an existing partner with new partner_name and/or partner_url

2. **Validate Partner Exists**: Query database to ensure the partner_id exists
   - If not found: Return error `"Partner not found"`

3. **Validate Update Data**: Check that at least one field is being updated

4. **Test New Partner URL** (if URL changed) (via H11 POST /api/v1/partners/:id/verify-connection): If partner_url is being updated, verify the new URL is reachable
   - If connection fails: Return error `"Partner URL unreachable"`

5. **Retrieve Updated Capabilities** (if URL changed) (via H11 GET /api/v1/partners/:id/capabilities): Call the partner's S09 service to refresh capability information

6. **Update Partner Record**: Update the partner record in the database with the new information and set updated_at timestamp

7. **Return Success Response**: Send back the updated partner details

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 3: Delete Partner Connection (via H24 DELETE)

1. **Receive Partner Deletion Request** (via H24 DELETE /api/v1/partners/:id): Core Portal submits a request to delete an existing partner connection

2. **Validate Partner Exists**: Query database to ensure the partner_id exists
   - If not found: Return error `"Partner not found"`

3. **Check for Active Sessions**: Verify that no active consultation sessions are currently using this partner
   - If active sessions exist: Return error `"Cannot delete active partner with ongoing sessions"`

4. **Mark Partner as Inactive**: Update the partner's `is_active` status to `false` in the database (soft delete)

5. **Record Deletion Timestamp**: Set the deleted_at timestamp

6. **Return Success Response**: Send back confirmation of deletion

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 4: Query Partner Endpoint (via A09 RabbitMQ)

1. **Receive Partner Endpoint Query** (via A09 get_partner_endpoint): Partner Gateway Service (S16) requests the endpoint URL of a specific partner by name or UUID

2. **Parse Partner Identifier**: Extract the partner_identifier from the request (can be name or UUID)

3. **Query Database**: Search the `partner` table for a matching partner by name or ID

4. **Verify Partner Status**: Check that the partner exists and is active
   - If not found: Return error `"Partner not found"`
   - If inactive: Return error `"Partner inactive"`

5. **Perform Health Check** (via H11 POST /api/v1/partners/:id/verify-connection): Verify the partner connection is currently responding (optional, for fresh health status)

6. **Return Partner Endpoint**: Send back the partner_id, partner_name, endpoint_url, api_version, status, and last_health_check timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

### Flow 5: Query Core Endpoint (via A09 RabbitMQ)

1. **Receive Core Endpoint Query** (via A09 get_core_endpoint): Partner Gateway Service (S16) requests the endpoint URL of the Core system or a specific Core service

2. **Parse Service Name**: Extract the optional service_name parameter (e.g., "portal", "consultant", "knowledge")

3. **Retrieve Core Configuration**: Load the appropriate Core endpoint URL from environment configuration or database
   - If service_name is provided: Return the specific service endpoint
   - If service_name is omitted: Return the main Core endpoint

4. **Verify Service Status**: Check that the requested Core service is currently available
   - If service not found: Return error `"Service not found"`
   - If unavailable: Return error `"Core service unavailable"`

5. **Return Core Endpoint**: Send back the service_name, endpoint_url, api_version, status, and last_health_check timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

### Flow 6: List Active Partners (via A09 RabbitMQ)

1. **Receive Active Partners List Request** (via A09 list_active_partners): Partner Gateway Service (S16) requests a list of all currently active partners

2. **Query Database**: Retrieve all partner records from the `partner` table where `is_active = true`

3. **Verify Database Connection**: Ensure the query executed successfully
   - If database error: Return error `"Database connection error"`
   - If no active partners found: Return error `"No active partners"`

4. **Build Partner List**: Construct an array of partner objects, each containing partner_id, partner_name, endpoint_url, and status

5. **Return Partners List**: Send back the partners array, total_count, and timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

## This Service's APIs

This service exposes the following APIs:

### **Core Portal**

[H24](../../api_groups/H24.md) - HTTP API for Core Portal to manage partner connections (create, update, delete)

### **Authorized Partner Gateway Service**

[A09](../../api_groups/A09.md) - RabbitMQ API to handle partner routing queries from Partner Gateway
- Request Queue: `partner_management_requests`
- Response Queue: `partner_management_responses`

## Peer Service APIs

This service calls the following peer service APIs:

### **Partner General Information Service (S09)**

[H11](../../api_groups/H11.md) - HTTP API to verify partner connections and retrieve partner capabilities

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

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | INT | PK, Auto Increment | ID định danh nhà mạng |
| `name` | VARCHAR(100) | Not Null, Unique | Tên nhà mạng (VD: Vinaphone, Viettel) |
| `public_key` | VARCHAR(255) | Not Null | Public key để xác thực API |
| `base_url` | VARCHAR(255) | Nullable | Endpoint API của hệ thống Partner |
| `is_active` | BOOLEAN | NOT NULL, Default: true | Trạng thái hoạt động |
| `created_at` | DATETIME | NOT NULL, Default: CURRENT_TIMESTAMP | Thời gian tạo |
| `updated_at` | DATETIME | NULL | Thời gian cập nhật gần nhất |
| `deleted_at` | DATETIME | NULL | Thời gian xóa (soft delete) |
| `last_health_check` | DATETIME | NULL | Thời gian kiểm tra kết nối gần nhất |
| `health_status` | VARCHAR(50) | NULL | Trạng thái sức khỏe: healthy/unhealthy/unknown |

Sample record:

```sql
INSERT INTO partner (id, name, public_key, base_url, is_active, created_at, last_health_check, health_status)
VALUES (1, 'Viettel', 'pk_viettel_abc123...', 'https://partner.viettel.com.vn/api', true, '2025-12-08 10:30:00', '2025-12-08 10:30:00', 'healthy');
```

### Table: `role`

Quản lý các vai trò trong hệ thống.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | INT | PK, Auto Increment | ID vai trò |
| `name` | VARCHAR(100) | Unique, Not Null | Tên vai trò (Admin, Chat Agent, Customer...) |

### Table: `permission_role`

Liên kết vai trò với quyền hạn.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `role_id` | INT | Indexed, Not Null | ID vai trò |
| `permission_id` | VARCHAR(100) | Indexed, Not Null | Tên vai trò (Admin, Chat Agent, Customer...) |

Quản lý các quyền hạn trong hệ thống.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | INT | PK, Auto Increment | ID quyền hạn |
| `name` | VARCHAR(255) | Unique, Not Null | Tên quyền (quyền xem, thêm, sửa, xóa gì đó; quyền tư vấn...) |