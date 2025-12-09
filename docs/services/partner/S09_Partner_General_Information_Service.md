# Telcenter Partner - **Partner General Information Service (S09)**

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

Now, you are designing the **Partner General Information Service (S09)** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **Partner General Information Service (S09)** service may interact with. We will come up
with the flow of this service itself later.

- **Core's Partner Management Service (S07)**: This service is deployed on the Core system and manages partner connections. S07 calls S09 via HTTP to retrieve partner information, verify connections, and get partner capabilities.
- **Authorized Core Gateway Service (S17)**: This service acts as the gateway on the Core system. S09 calls S17 via RabbitMQ to query Core service endpoint information when Partner services need to communicate with Core.

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

### **Core's Partner Management Service (S07)**

S07 calls this service to get partner information and verify connections.

[H11 - API between S07 and S09](../../api_groups/H11.md)

This HTTP API defines endpoints that S07 calls to S09:
- `GET /api/v1/partners/:id` - S07 calls this to retrieve detailed information about this partner
- `POST /api/v1/partners/:id/verify-connection` - S07 calls this to verify that this partner connection is active
- `GET /api/v1/partners/:id/capabilities` - S07 calls this to retrieve services and features supported by this partner

S09 needs to implement these endpoints and respond to S07's requests.

### **Authorized Core Gateway Service (S17)**

S09 calls this service to query Core service endpoint information.

[A12 - API between S09 and S17](../../api_groups/A12.md)

This RabbitMQ API provides three methods that S09 can call:
- `get_core_service_endpoint` - Query the endpoint URL of a specific Core service by name (e.g., "consultant", "knowledge", "metrics")
- `get_core_main_endpoint` - Query the main endpoint URL of the Core system
- `list_available_core_services` - Get a list of all currently available Core services with their endpoints

**Default queue names:**
- Request queue: `s09_to_s17_requests` (S09 publishes to this queue)
- Response queue: `s09_to_s17_responses` (S09 listens on this queue)

These should be configurable via `.env`:
```
A12_REQUEST_QUEUE=s09_to_s17_requests
A12_RESPONSE_QUEUE=s09_to_s17_responses
```

## The Flow

### Flow 1: Provide Partner Information to Core (H11 Endpoint 1)

This flow handles requests from Core's Partner Management Service (S07) to retrieve partner information.

1. **Receive HTTP request from Core S07**: A GET request arrives at `/api/v1/partners/:id` (H11 endpoint).

2. **Validate partner ID**: Check if the provided `:id` matches this partner instance's ID (configured in `.env` or database).
   - If ID doesn't match, return error: `"Partner not found"`

3. **Query partner information**: Retrieve data from the `partner_info` table including:
   - Partner name, URL, status
   - Capabilities (services, features, payment methods, regions, languages) from `capabilities_json`
   - Max concurrent sessions
   - Current active sessions count (query from active conversations)

4. **Check health status**: 
   - Query the `core_connection_config` table to verify Core connection
   - Query `partner_health_log` for recent health check results
   - Set `health_status` to "healthy" or "unhealthy" based on checks

5. **Return success response**: Send back comprehensive partner information with all requested fields.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 2: Verify Partner Connection (H11 Endpoint 2)

This flow handles connection verification requests from Core.

1. **Receive HTTP request from Core S07**: A POST request arrives at `/api/v1/partners/:id/verify-connection` (H11 endpoint).

2. **Validate partner ID**: Check if the provided `:id` matches this partner instance.
   - If ID doesn't match, return error: `"Partner not found"`

3. **Retrieve Core connection config**: Query the `core_connection_config` table to get Core URL and API key.
   - If no config found, return error with timeout status

4. **Ping Core connection**: 
   - Make a test HTTP request to Core using stored credentials
   - Measure response time
   - Validate API key authentication
   - Handle various error cases (timeout, auth failed, etc.)

5. **Update health log**: Insert a record into `partner_health_log` with:
   - `check_type = "core_connection"`
   - `status` based on result
   - `response_time_ms`
   - Current timestamp

6. **Update connection config**: Update `last_tested_at` and `last_test_result` in `core_connection_config` table.

7. **Return success response**: Send back connection status, response time, last successful ping, and API version.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 3: Provide Partner Capabilities (H11 Endpoint 3)

This flow handles requests for partner capabilities information.

1. **Receive HTTP request from Core S07**: A GET request arrives at `/api/v1/partners/:id/capabilities` (H11 endpoint).

2. **Validate partner ID**: Check if the provided `:id` matches this partner instance.
   - If ID doesn't match, return error: `"Partner not found"`

3. **Query capabilities data**: Retrieve `capabilities_json` from the `partner_info` table.
   - If capabilities data is NULL or empty, return error: `"Capabilities data not available"`

4. **Parse capabilities JSON**: Extract and structure the capabilities information including:
   - Services (voice, sms, data, roaming, etc.)
   - Features (prepaid, postpaid, package management, etc.)
   - Supported payment methods
   - Regions covered
   - Languages supported

5. **Return success response**: Send back detailed capabilities with `last_updated` timestamp from `partner_info.updated_at`.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 4: Get Partner Information for Portal (H25 Endpoint 1)

This flow handles requests from Partner Portal to view partner information.

1. **Receive HTTP request from Partner Portal**: A GET request arrives at `/api/partner/info` (H25 endpoint).

2. **Authenticate user**: Verify the user session/token to ensure they are logged in.
   - If not authenticated, return error: `"Unauthorized: Admin privileges required"`

3. **Query partner information**: Retrieve all fields from the `partner_info` table:
   - Partner ID, name, domain, logo URL
   - Contact email, phone, address
   - Description
   - Updated timestamp

4. **Return success response**: Send back all partner information for display in the portal.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 5: Update Partner Information (H25 Endpoint 2)

This flow handles updates to partner information from the Portal.

1. **Receive HTTP request from Partner Portal**: A PUT request arrives at `/api/partner/info` (H25 endpoint) with updated fields.

2. **Authenticate user**: Verify the user has admin privileges.
   - If not authorized, return error: `"Unauthorized: Admin privileges required"`

3. **Validate input data**: 
   - Check required fields are present
   - Validate data formats (email, phone, URL, etc.)
   - If validation fails, return error: `"Missing required fields: [field_names]"` or appropriate validation error

4. **Check domain uniqueness** (if domain is being changed): 
   - Query if another partner is using the new domain
   - If duplicate exists (and it's not this partner), return error: `"Partner domain already exists"`

5. **Update database**: Update the `partner_info` table with new values, set `updated_at = NOW()`.

6. **Return success response**: Send back the updated partner information with new `updated_at` timestamp.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 6: Upload Partner Logo (H25 Endpoint 3)

This flow handles logo file uploads from the Partner Portal.

1. **Receive HTTP request from Partner Portal**: A POST request arrives at `/api/partner/logo` (H25 endpoint) with multipart/form-data containing the logo file.

2. **Authenticate user**: Verify the user has admin privileges.
   - If not authorized, return error: `"Unauthorized: Admin privileges required"`

3. **Validate file**:
   - Check file size doesn't exceed maximum (e.g., 5MB)
     - If too large, return error: `"File size too large. Maximum size is 5MB"`
   - Check file format is supported (PNG, JPG, JPEG, SVG)
     - If invalid format, return error: `"Invalid file format. Supported formats: PNG, JPG, SVG"`
   - Validate file integrity (check if it's a valid image)
     - If corrupted, return error: `"Invalid or corrupted image file"`

4. **Generate unique filename**: Create a unique filename to prevent collisions (e.g., using UUID or timestamp).

5. **Save file to storage**: 
   - Save to configured storage location (local filesystem or CDN)
   - Get the accessible URL for the saved file

6. **Update database**: Update `partner_info.partner_logo_url` with the new logo URL, set `updated_at = NOW()`.

7. **Return success response**: Send back the new `logo_url` and `uploaded_at` timestamp.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 7: Get Core Connection Configuration (H26 Endpoint 1)

This flow handles requests to view Core connection settings.

1. **Receive HTTP request from Partner Portal**: A GET request arrives at `/api/partner/core-connection` (H26 endpoint).

2. **Authenticate user**: Verify the user has admin privileges.
   - If not authorized, return error: `"Unauthorized: Admin privileges required"`

3. **Query connection configuration**: Retrieve from the `core_connection_config` table:
   - Core URL, API key (possibly masked for security)
   - Connection status
   - Last tested timestamp and result
   - Created and updated timestamps
   - If no configuration exists, return error: `"No core connection configured"`

4. **Return success response**: Send back all connection configuration details.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 8: Test Core Connection (H26 Endpoint 2)

This flow handles connection testing before saving configuration (TP-06 use case).

1. **Receive HTTP request from Partner Portal**: A POST request arrives at `/api/partner/core-connection/test` (H26 endpoint) with:
   - `core_url`: Core system URL to test
   - `api_key`: API key for authentication

2. **Authenticate user**: Verify the user has admin privileges.
   - If not authorized, return error: `"Unauthorized: Admin privileges required"`

3. **Validate input**: 
   - Check Core URL format is valid
   - Check API key format is valid

4. **Attempt connection to Core**:
   - Make HTTP request to Core URL with provided API key
   - Measure response time
   - Try to retrieve Core version
   - Handle various error scenarios:
     - If URL unreachable, return error: `"Cannot connect to Core: Invalid URL or server unreachable"`
     - If API key invalid, return error: `"Authentication failed: Invalid API key"`
     - If API key expired, return error: `"Authentication failed: API key has expired"`
     - If Core returns server error, return error: `"Core server error: [error details]"`
     - If timeout occurs, return error: `"Connection timeout after 30 seconds"`

5. **Store test result temporarily**: Keep the test result in memory/cache for a short period to validate during save operation.

6. **Return test result**: Send back:
   - Connection status ("active" or "failed")
   - Response time in milliseconds
   - Core version (if successful)
   - Tested timestamp
   - Error details (if failed)

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 9: Save Core Connection Configuration (H26 Endpoint 3)

This flow handles saving the Core connection configuration after successful testing.

1. **Receive HTTP request from Partner Portal**: A PUT request arrives at `/api/partner/core-connection` (H26 endpoint) with:
   - `core_url`: Core system URL
   - `api_key`: API key for authentication

2. **Authenticate user**: Verify the user has admin privileges.
   - If not authorized, return error: `"Unauthorized: Admin privileges required"`

3. **Validate input**:
   - Check required fields are present
     - If missing, return error: `"Missing required fields: [field_names]"`
   - Validate Core URL format
     - If invalid, return error: `"Invalid Core URL format"`
   - Validate API key format
     - If invalid, return error: `"Invalid API key format"`

4. **Verify recent successful test**: Check if a successful test was recently performed for this URL and API key combination.
   - If not tested or test failed, return error: `"Cannot save: Connection test must be successful before saving"`

5. **Save or update configuration**: 
   - If a configuration record exists, update it
   - If not, insert a new record
   - Store: `core_url`, `api_key` (encrypted), `connection_status = "active"`, timestamps
   - Clear any previous error messages

6. **Return success response**: Send back saved configuration with success message and `updated_at` timestamp.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

### Flow 10: Query Core Service Endpoints (Internal Usage)

This flow is used internally when Partner services need to discover Core service endpoints.

1. **Determine which Core service is needed**: The calling code specifies a service name (e.g., "consultant", "knowledge", "metrics").

2. **Prepare RabbitMQ request**: Build a message with:
   - `method`: "get_core_service_endpoint" (or other A12 methods)
   - `params`: `{"service_identifier": "service_name"}`
   - `id`: Unique correlation ID

3. **Send request via A12**: Publish message to the A12 request queue (`s09_to_s17_requests`).

4. **Wait for response**: Listen on the A12 response queue (`s09_to_s17_responses`) for a message with matching correlation ID.

5. **Parse response**:
   - If `status == "success"`, extract endpoint URL from `content`
   - If `status == "error"`, handle error appropriately

6. **Return endpoint information**: Provide the endpoint URL to the calling code for subsequent API calls.

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes three API groups for different consumers:

### **H11 - API for Core's Partner Management Service**

[H11 - API between S07 and S09](../../api_groups/H11.md)

This HTTP API provides partner information to Core's S07:
- `GET /api/v1/partners/:id` - Retrieve detailed information about this partner
- `POST /api/v1/partners/:id/verify-connection` - Verify that this partner connection is active and responding
- `GET /api/v1/partners/:id/capabilities` - Retrieve the list of services and features supported by this partner

### **H25 - API for Partner Portal (Partner Information Management)**

[H25 - API between Partner Portal and S09](../../api_groups/H25.md)

This HTTP API allows Partner administrators to manage partner information:
- `GET /api/partner/info` - Get current partner general information (name, logo, contact info, etc.)
- `PUT /api/partner/info` - Update partner general information
- `POST /api/partner/logo` - Upload new partner logo (multipart/form-data)

### **H26 - API for Partner Portal (Core Connection Management)**

[H26 - API between Partner Portal and S09](../../api_groups/H26.md)

This HTTP API allows Partner administrators to manage Core connection:
- `GET /api/partner/core-connection` - Get current Telcenter Core connection configuration
- `POST /api/partner/core-connection/test` - Test the connection to Telcenter Core with provided credentials
- `PUT /api/partner/core-connection` - Save or update the Telcenter Core connection configuration

## Database Schema

This service directly interacts with the **Partner General Information DB** database. It manages three main tables.

### Table: `partner_info`

**Storage Location**: Telcenter Partner - Partner General Information DB

**Purpose**: Store general information about this partner organization (the telecom company).

| Tên trường | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
|:-----------|:-------------|:------------------------|:------|
| id | VARCHAR(50) | PK | ID định danh nhà mạng (e.g., "partner_viettel") - Partner identifier |
| partner_name | VARCHAR(255) | NOT NULL | Tên nhà mạng (VD: "Viettel Telecom") - Official partner name |
| partner_domain | VARCHAR(255) | UNIQUE, NOT NULL | Domain của nhà mạng (VD: "viettel.com.vn") - Partner's domain |
| partner_logo_url | VARCHAR(500) | Nullable | URL logo của nhà mạng - URL to partner's logo image |
| contact_email | VARCHAR(255) | NOT NULL | Email liên hệ (VD: "support@viettel.com.vn") - Contact email |
| contact_phone | VARCHAR(50) | NOT NULL | Số điện thoại (VD: "18008098") - Contact phone |
| address | TEXT | Nullable | Địa chỉ trụ sở - Main office address |
| description | TEXT | Nullable | Mô tả về nhà mạng - Partner description |
| capabilities_json | TEXT | Nullable | JSON string về khả năng (services, features, payment methods, regions, languages) |
| max_concurrent_sessions | INT | Default 100 | Số phiên tối đa có thể xử lý - Maximum concurrent sessions |
| api_version | VARCHAR(20) | Default "1.0.0" | Phiên bản API - API version |
| status | ENUM | Default "active" | Trạng thái: "active", "inactive", "maintenance" - System status |
| created_at | TIMESTAMP | Default NOW() | Thời điểm tạo |
| updated_at | TIMESTAMP | Default NOW(), On Update NOW() | Thời điểm cập nhật |

**Indexes:**
- Primary key on `id`
- Unique index on `partner_domain`
- Index on `status`

### Table: `core_connection_config`

**Storage Location**: Telcenter Partner - Partner General Information DB

**Purpose**: Store configuration for connecting to Telcenter Core system.

| Tên trường | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
|:-----------|:-------------|:------------------------|:------|
| id | INT | PK, Auto Increment | ID cấu hình - Configuration ID |
| core_url | VARCHAR(500) | NOT NULL | URL của Core (VD: "https://core.telcenter.vn") - Core URL |
| api_key | VARCHAR(255) | NOT NULL | API key để xác thực - API key for auth (stored encrypted) |
| connection_status | ENUM | Default "inactive" | Trạng thái: "active", "inactive", "failed" - Connection status |
| last_tested_at | TIMESTAMP | Nullable | Thời điểm test gần nhất - Last test timestamp |
| last_test_result | ENUM | Nullable | Kết quả test: "success", "failed" - Last test result |
| last_test_error | TEXT | Nullable | Thông báo lỗi nếu failed - Error message from last failed test |
| response_time_ms | INT | Nullable | Thời gian phản hồi (ms) - Response time of last test |
| core_version | VARCHAR(50) | Nullable | Phiên bản Core - Detected Core version |
| created_at | TIMESTAMP | Default NOW() | Thời điểm tạo |
| updated_at | TIMESTAMP | Default NOW(), On Update NOW() | Thời điểm cập nhật |

**Indexes:**
- Primary key on `id`
- Index on `connection_status`
- Index on `last_tested_at`

**Business Rules:**
1. Chỉ nên có một active Core connection configuration tại một thời điểm
2. API key phải được mã hóa khi lưu trữ (encryption at rest)
3. Connection test phải thành công trước khi cho phép lưu configuration (TP-06)
4. Nên có automatic periodic health checks để cập nhật `last_tested_at`

### Table: `partner_health_log`

**Storage Location**: Telcenter Partner - Partner General Information DB

**Purpose**: Track partner system health and connection status over time (for monitoring).

| Tên trường | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
|:-----------|:-------------|:------------------------|:------|
| id | BIGINT | PK, Auto Increment | ID log entry |
| check_type | ENUM | NOT NULL | Loại kiểm tra: "core_connection", "system_health", "capacity" |
| status | ENUM | NOT NULL | Kết quả: "healthy", "degraded", "unhealthy" |
| current_active_sessions | INT | Default 0 | Số phiên đang active - Current active sessions count |
| response_time_ms | INT | Nullable | Thời gian phản hồi (nếu test kết nối) - Response time |
| error_message | TEXT | Nullable | Thông báo lỗi nếu có - Error message if check failed |
| created_at | TIMESTAMP | Default NOW() | Thời điểm kiểm tra - Check timestamp |

**Indexes:**
- Primary key on `id`
- Index on `check_type`
- Index on `created_at` (for time-series queries)
- Index on `status`

**Business Rules:**
1. Health checks nên chạy định kỳ (e.g., mỗi 5 phút)
2. Old logs nên được archive hoặc xóa sau retention period (e.g., 90 ngày)
3. Status "degraded" hoặc "unhealthy" nên trigger alerts cho admins

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
