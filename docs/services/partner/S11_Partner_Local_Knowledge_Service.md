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

## The Flow

This service supports the following use cases
(from the frontend's perspective):

- TP-07: Thêm gói cước
- TP-08: Sửa gói cước
- TP-09: Xóa gói cước
- TP-10: Thêm câu hỏi thường gặp (FAQ)
- TP-11: Sửa FAQ
- TP-12: Xóa FAQ
- TP-13a: Tải file dữ liệu kiến thức viễn thông lên hệ thống (import file).
- TP-13b: Xem trạng thái xử lý file dữ liệu kiến thức viễn thông đã tải lên (danh sách các file imports).
- TP-13c: Xem chi tiết một file import (bao gồm các gói cước được trích xuất từ file, nếu trích xuất thành công).
- TP-13d: Sửa thông tin các gói cước được trích xuất từ file import (tại trang chi tiết file import). Bao gồm sửa, thêm, và xóa các gói cước đó.
- TP-13e: Approve một file import - tức là chấp nhận các gói cước được trích xuất từ file import (tại trang chi tiết file import) để đưa vào cơ sở dữ liệu chính thức của hệ thống.
- TP-13f: Reject một file import.

The CRUD operations for packages and FAQs
are done through the H28 API from the Partner Portal,
and are standard CRUD operations (trivial).

Below are the non-trivial flows.

### Main Flow 1: Import File

Steps:

1. Partner Portal frontend calls the H28 API
    `POST /api/v1/local-knowledge/file-imports`
    to upload a file to be imported.

2. S11 stores the uploaded file into SeaweedFS,
    and creates a new `file_imports` record
    in its database with status `PENDING`.

3. S11 sends an `import_file` request
    to S15 File Importing AI Agent via RabbitMQ
    (using API A32), providing the SeaweedFS file ID.
    Use the file import ID as the
    RPC method request ID.

4. S11 returns a response to the Partner Portal
    frontend indicating that the file import
    request has been accepted, with the
    corresponding file import ID.

### Subthread Flow: Handle File Import Result

1. After S15 has received the `import_file` request,
    it retrieves the file from SeaweedFS
    using the provided file ID.
2. S15 processes the file, extracts telecom
    knowledge, and returns the result to S11
    via RabbitMQ response (API A32), preserving
    the RPC method request ID in the response.
3. S11 receives the response from S15 from the
    response queue in a separate thread.
4. S11 updates the corresponding `file_imports`
    record in its database (by corresponding,
    matching the file import ID with the RPC
    method request ID):
    - If S15 returned success, update status to
      `EXTRACTED` and store the extracted packages.
    - If S15 returned error, update status to
      `FAILED` and store the error message.

### Main Flow 2: Approve/Reject File Import

1. Partner Portal frontend calls the H28 API
    `POST /api/v1/local-knowledge/file-imports/{import_id}/approve`
    or
    `POST /api/v1/local-knowledge/file-imports/{import_id}/reject`
    to approve or reject a file import.

2. S11 updates the corresponding `file_imports` record
    in its database:
    - If approved, set status to `APPROVED` and
      insert the extracted packages into
      the main `packages` collection.
    - If rejected, set status to `REJECTED`.

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

Fields:

- `_id` (ObjectId, Primary Key): ID của gói cước
- `Mã dịch vụ` (string): Mã dịch vụ gói cước
- `Thời gian thanh toán` (string): Hình thức thanh toán (trả trước/trả sau)
- `Các dịch vụ tiên quyết` (string): Các dịch vụ cần có để đăng ký gói cước
- `Giá (VNĐ)` (number): Giá gói cước (VNĐ)
- `Chu kỳ (ngày)` (number): Chu kỳ gói cước (ngày)
- `4G tốc độ tiêu chuẩn/ngày` (number): Dung lượng 4G tốc độ tiêu chuẩn mỗi ngày (GB)
- `4G tốc độ cao/ngày` (number): Dung lượng 4G tốc độ cao mỗi ngày (GB)
- `4G tốc độ tiêu chuẩn/chu kỳ` (number): Dung lượng 4G tốc độ tiêu chuẩn mỗi chu kỳ (GB)
- `4G tốc độ cao/chu kỳ` (number): Dung lượng 4G tốc độ cao mỗi chu kỳ (GB)
- `Gọi nội mạng` (string): Thông tin gọi nội mạng
- `Gọi ngoại mạng` (string): Thông tin gọi ngoại mạng
- `Tin nhắn` (string): Thông tin tin nhắn
- `Chi tiết` (string): Thông tin chi tiết gói cước
- `Tự động gia hạn` (string): Thông tin về tự động gia hạn
- `Cú pháp đăng ký` (string): Cú pháp đăng ký gói cước

### Collection: `faqs` (Câu hỏi thường gặp local)

Lưu các câu hỏi và câu trả lời của Partner này.

Fields:

- `_id` (ObjectId, Primary Key): ID của câu hỏi
- `question` (string): Nội dung câu hỏi thường gặp
- `answer` (string): Nội dung câu trả lời chuẩn

Sample `faqs` document:

```json
{
    "id": "...",
    "question": "Làm sao để kiểm tra số dư?",
    "answer": "Bấm *101# để kiểm tra số dư tài khoản."
}
```

### Collection: `file_imports` (Lịch sử nhập file)

Lưu thông tin, trạng thái các lần nhập file dữ liệu kiến thức viễn thông.

Fields:

- `_id` (ObjectId, Primary Key): ID của lần nhập file
- `file_name` (string): Tên file được nhập
- `seaweed_file_id` (string): ID file trong SeaweedFS
- `packages` (array of Package): Danh sách các gói cước đã được File Importing AI Agent
    trích xuất từ file. Định dạng giống như trong collection `packages` (tất nhiên
    trừ `_id`). Nếu không có gói cước nào được trích xuất hoặc File Importing AI Agent
    chưa chạy xong, trường này là mảng rỗng.
- `status` (string): Trạng thái xử lý file. Nhận một trong các giá trị: `PENDING`, `EXTRACTED`, `FAILED`, `APPROVED`, `REJECTED`.
- `error_message` (string, optional): Thông tin lỗi nếu trạng thái là `FAILED`.
- `created_at` (datetime): Thời điểm tạo bản ghi import file này.
