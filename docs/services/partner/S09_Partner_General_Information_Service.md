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

## Peer Service APIs

Note that the base URL to call the services
must be specified via `.env`. Construct
a `.env.example` file for that.

### **Core's Partner Management Service (S07)**

[H11](../../api_groups/H11.md)

### **Authorized Core Gateway Service**

[A12](../../api_groups/A12.md)

### **Partner Portal**

[H25](../../api_groups/H25.md)
[H26](../../api_groups/H26.md)

## The Flow

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
