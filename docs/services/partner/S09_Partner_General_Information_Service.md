# Telcenter Partner - **S09: Partner General Information Service**

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

Now, you are designing the **S09: Partner General Information Service** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **S09: Partner General Information Service** service may interact with. We will come up
with the flow of this service itself later.

- **Core's Partner Management Service (S07)**: This service is deployed on the Core system and manages partner connections. S07 calls S09 via HTTP to retrieve partner information, verify connections, and get partner capabilities.
- **Authorized Core Gateway Service**: This Core Gateway acts as the gateway on the Core system. Core Gateway calls S09 via RabbitMQ to query Core service endpoint information when Partner services need to communicate with Core.
- **Partner Portal**: This is the administrative web interface for Telcenter Partner system. Partner administrators use this portal to manage their partner information, capabilities, and system configuration. The Partner Portal calls S09 via HTTP REST API (H25 and H26) to view and update partner information, upload logo, manage capabilities, and configure Core connection. All partner self-management operations are initiated from this portal.

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

## Environment Configuration

Note that the base URLs to call peer services
must be specified via `.env`. Construct
a `.env.example` file for that.

Required environment variables:
- `PARTNER_INFO_DB_HOST`: MySQL/MariaDB host for partner database
- `PARTNER_INFO_DB_PORT`: Database port
- `PARTNER_INFO_DB_NAME`: Database name (`telcenter_partner_local`)
- `PARTNER_INFO_DB_USER`: Database user
- `PARTNER_INFO_DB_PASSWORD`: Database password
- `RABBITMQ_HOST`: RabbitMQ server host
- `RABBITMQ_PORT`: RabbitMQ server port
- `RABBITMQ_USER`: RabbitMQ username
- `RABBITMQ_PASSWORD`: RabbitMQ password
- `A12_REQUEST_QUEUE`: RabbitMQ queue name for A12 requests (default: `partner_core_gateway_requests`)
- `A12_RESPONSE_QUEUE`: RabbitMQ queue name for A12 responses (default: `partner_core_gateway_responses`)
- `CORE_S07_BASE_URL`: Base URL for Core's Partner Management Service (S07)
- `FLASK_HOST`: Host for Flask HTTP API (default: `0.0.0.0`)
- `FLASK_PORT`: Port for Flask HTTP API (default: `5000`)
- `FILE_UPLOAD_MAX_SIZE`: Maximum file size for logo uploads (default: `5242880` = 5MB)
- `CDN_BASE_URL`: CDN URL for storing uploaded logos

## The Flow

### Flow 1: Get Partner Information (via H25 GET)

1. **Receive Partner Info Request** (via H25 GET /api/partner/info): Partner Portal requests current partner general information

2. **Authenticate Request**: Verify the requesting user's session/token is valid

3. **Query Database**: Retrieve partner information from the `partner_info` table

4. **Return Partner Information**: Send back partner details including partner_id, name, domain, logo URL, contact info, address, description, and timestamps

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 2: Update Partner Information (via H25 PUT)

1. **Receive Partner Update Request** (via H25 PUT /api/partner/info): Partner Portal submits updated partner information (name, domain, contact email, phone, address, description)

2. **Authenticate Request**: Verify the requesting user has admin privileges
   - If not authorized: Return error `"Unauthorized: Admin privileges required"`

3. **Validate Request Data**: Check that required fields are present and properly formatted
   - If missing fields: Return error `"Missing required fields: [field_names]"`

4. **Check Domain Uniqueness**: Verify the partner_domain is not already used by another partner
   - If duplicate: Return error `"Partner domain already exists"`

5. **Update Database**: Update the partner information in the `partner_info` table with new values and set updated_at timestamp

6. **Return Success Response**: Send back the updated partner information

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 3: Upload Partner Logo (via H25 POST)

1. **Receive Logo Upload Request** (via H25 POST /api/partner/logo): Partner Portal uploads a new logo image file

2. **Authenticate Request**: Verify the requesting user has admin privileges
   - If not authorized: Return error `"Unauthorized: Admin privileges required"`

3. **Validate File**: Check the uploaded file meets requirements
   - If file too large: Return error `"File size too large. Maximum size is 5MB"`
   - If invalid format: Return error `"Invalid file format. Supported formats: PNG, JPG, SVG"`
   - If corrupted: Return error `"Invalid or corrupted image file"`

4. **Process Image**: Validate and optionally resize/optimize the image

5. **Upload to CDN**: Store the logo file on CDN or file storage system

6. **Update Database**: Save the new logo URL to the `partner_info` table

7. **Return Success Response**: Send back the new logo URL and upload timestamp

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 4: Get Core Connection Configuration (via H26 GET)

1. **Receive Connection Info Request** (via H26 GET /api/partner/core-connection): Partner Portal requests current Core connection configuration

2. **Authenticate Request**: Verify the requesting user has admin privileges
   - If not authorized: Return error `"Unauthorized: Admin privileges required"`

3. **Query Database**: Retrieve Core connection information from the `core_connection` table
   - If not configured: Return error `"No core connection configured"`

4. **Return Connection Configuration**: Send back core_url, api_key (masked for security), connection_status, last test results, and timestamps

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 5: Test Core Connection (via H26 POST)

1. **Receive Connection Test Request** (via H26 POST /api/partner/core-connection/test): Partner Portal submits Core URL and API key for testing

2. **Authenticate Request**: Verify the requesting user has admin privileges
   - If not authorized: Return error `"Unauthorized: Admin privileges required"`

3. **Validate Input**: Check that core_url and api_key are provided and properly formatted

4. **Attempt Connection** (via H11): Call Core's Partner Management Service to verify the connection
   - Measure response time
   - Verify API key authentication
   - Check Core service availability

5. **Handle Connection Results**:
   - If connection successful: Return success with connection_status "active", response_time_ms, core_version, and tested_at
   - If URL unreachable: Return error `"Cannot connect to Core: Invalid URL or server unreachable"`
   - If API key invalid: Return error `"Authentication failed: Invalid API key"`
   - If API key expired: Return error `"Authentication failed: API key has expired"`
   - If timeout: Return error `"Connection timeout after 30 seconds"`
   - If Core error: Return error `"Core server error: [error details]"`

6. **Update Test Record**: Store the test result and timestamp in database

If it fails at any stage, return the appropriate error response.

### Flow 6: Save Core Connection Configuration (via H26 PUT)

1. **Receive Connection Save Request** (via H26 PUT /api/partner/core-connection): Partner Portal submits Core URL and API key to save

2. **Authenticate Request**: Verify the requesting user has admin privileges
   - If not authorized: Return error `"Unauthorized: Admin privileges required"`

3. **Validate Request Data**: Check that required fields are present
   - If missing fields: Return error `"Missing required fields: [field_names]"`
   - If invalid URL format: Return error `"Invalid Core URL format"`
   - If invalid API key format: Return error `"Invalid API key format"`

4. **Verify Recent Successful Test**: Check that a recent successful connection test was performed
   - If no recent test: Return error `"Cannot save: Connection test must be successful before saving"`

5. **Save to Database**: Insert or update the Core connection configuration in the `core_connection` table

6. **Update Connection Status**: Set connection_status to "active" and record updated_at timestamp

7. **Return Success Response**: Send back the saved configuration

If it fails at any stage, the whole process fails. That is, immediately return error with the appropriate error message.

### Flow 7: Query Core Service Endpoint (via A12 RabbitMQ)

1. **Receive Core Service Endpoint Query** (via A12 get_core_service_endpoint): Authorized Core Gateway Service (S17) requests the endpoint URL of a specific Core service

2. **Parse Service Identifier**: Extract the service_identifier from the request (e.g., "consultant", "knowledge", "metrics", "portal")

3. **Retrieve Core Configuration**: Load the Core connection configuration from the `core_connection` table

4. **Query Service Catalog**: Look up the specific service endpoint based on service_identifier
   - If service not found: Return error `"Service not found"`

5. **Verify Service Availability**: Check that the service is currently available
   - If unavailable: Return error `"Service unavailable"`

6. **Return Service Endpoint**: Send back service_id, service_name, endpoint_url, api_version, status, and last_health_check timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

### Flow 8: Query Core Main Endpoint (via A12 RabbitMQ)

1. **Receive Core Main Endpoint Query** (via A12 get_core_main_endpoint): Authorized Core Gateway Service (S17) requests the main Core system endpoint

2. **Retrieve Core Configuration**: Load the Core connection configuration from the `core_connection` table
   - If Core unavailable: Return error `"Core unavailable"`

3. **Query Gateway Information**: Retrieve the main Core endpoint and gateway URLs

4. **Verify Core Status**: Check that the Core system is currently responding
   - If timeout: Return error `"Gateway timeout"`

5. **Return Core Main Endpoint**: Send back core_name, main_endpoint_url, gateway_url, api_version, status, supported_protocols, and last_health_check timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

### Flow 9: List Available Core Services (via A12 RabbitMQ)

1. **Receive Core Services List Request** (via A12 list_available_core_services): Authorized Core Gateway Service (S17) requests a list of all available Core services

2. **Authenticate Partner**: Verify the partner is authorized to query Core services
   - If not authorized: Return error `"Authentication required"`

3. **Retrieve Core Configuration**: Load the Core connection configuration from the `core_connection` table

4. **Query Service Registry**: Retrieve all available Core services from the service catalog
   - If no services: Return error `"No services available"`
   - If connection error: Return error `"Gateway connection error"`

5. **Build Services List**: Construct an array of service objects, each containing service_id, service_name, endpoint_url, and status

6. **Return Services List**: Send back the services array, total_count, and timestamp

If it fails at any stage, return the appropriate error response via RabbitMQ.

## This Service's APIs

This service exposes the following APIs:

### **Partner Portal**

[H25](../../api_groups/H25.md) - HTTP API for Partner Portal to manage partner general information (view, update, upload logo)

[H26](../../api_groups/H26.md) - HTTP API for Partner Portal to manage Core connection configuration (view, test, save)

### **Authorized Core Gateway Service**

[A12](../../api_groups/A12.md) - RabbitMQ API to handle Core service endpoint queries from Core Gateway
- Request Queue: `partner_core_gateway_requests`
- Response Queue: `partner_core_gateway_responses`

### **Core's Partner Management Service (S07)**

[H11](../../api_groups/H11.md) - HTTP API to test connection to Core and verify API key authentication

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

Database: `telcenter_partner_partner`

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