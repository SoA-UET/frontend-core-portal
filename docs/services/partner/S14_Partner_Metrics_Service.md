# Telcenter Core - **S14. Metrics Service**

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

Now, you are designing the **S14. Metrics Service** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **S14. Metrics Service** service may interact with. We will come up
with the flow of this service itself later.

- **S08. Core Metrics Service**: A service that measures and monitors certain metrics for other services. 


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

### **S08. Core Metrics Service**
[A17](../api_groups/A17.md) (Event)
[A17](../api_groups/A17.md) (Method)




## The Flow

S14 Partner Metrics Service aggregates and provides 3 main types of metrics for the Partner Portal. The service operates in two modes: real-time metrics collection via events from Core (background processing) and responding to HTTP requests (on-demand queries).

---

### Flow 1: Total Active Conversations with Partner Consultants

**Background Processing (A17a Event Consumer):**

1. **Service Startup - Initial Data Load**:
   - Call A17b Method API to get current partner conversation statistics from S08
   - Send RabbitMQ request via queue `s14_s08_requests_queue`
   - Method: `get_partner_conversation_statistics` with this partner's `partner_id`
   - Wait for response from queue `s14_s08_responses_queue`
   - Initialize counters in metrics database:
     - `total_conversations`
     - `forwarding_conversations` (conversations being forwarded to partner)
     - `texting_conversations` (HUMAN_AGENT_TEXTING)
     - `calling_conversations` (HUMAN_AGENT_CALLING)
   - Cache initial data in Redis
   - If API call fails, retry up to 3 times before marking service as unhealthy
   - Handle errors:
     - "PARTNER_NOT_FOUND": Log error and initialize all counters to 0
     - "DB_CONNECTION_ERROR": Retry with backoff

2. **Initialize Event Listener**:
   - Spawn worker thread to consume events from S08 Core Metrics Service
   - RabbitMQ queue: `s08_events_queue` (A17a)
   - Filter events by this partner's `partner_id`

3. **Process `conversation_start_by_partner` Event**:
   - Validate payload: `conversation_id`, `partner_id`, `started_at`
   - Verify `partner_id` matches this Partner's ID
   - Increment `total_conversations` counter
   - Initialize conversation with default status "FORWARDING"
   - Increment `forwarding_conversations` counter
   - Store conversation metadata in cache

4. **Process `conversation_changed_status_by_partner` Event**:
   - Validate payload: `conversation_id`, `partner_id`, `old_status`, `new_status`, `updated_at`
   - Verify `partner_id` matches this Partner's ID
   - **Map status to category:**
     - `FORWARDING` → forwarding_conversations
     - `HUMAN_AGENT_TEXTING` → texting_conversations
     - `HUMAN_AGENT_CALLING` → calling_conversations
   - **Update counters:**
     - Decrement (-1) counter for category of `old_status`
     - Increment (+1) counter for category of `new_status`
   - **Examples:**
     - `old_status=FORWARDING, new_status=HUMAN_AGENT_TEXTING`: forwarding_conversations--, texting_conversations++
     - `old_status=HUMAN_AGENT_TEXTING, new_status=HUMAN_AGENT_CALLING`: texting_conversations--, calling_conversations++
     - `old_status=FORWARDING, new_status=HUMAN_AGENT_CALLING`: forwarding_conversations--, calling_conversations++
   - Persist to database and update Redis cache

**On-Demand Query (H30.1: `GET /api/v1/partner/metrics/conversations`):**

1. **Authenticate Request**: Validate JWT token for Partner Portal
2. **Validate Query Parameters**: Parse `from_date`, `to_date` (optional)
3. **Query S08 via A17b Method API** (if date filters specified):
   - Method: `get_partner_conversation_statistics` with `partner_id`
   - Handle errors: "PARTNER_NOT_FOUND", "DB_CONNECTION_ERROR"
4. **Retrieve from Cache** (if no date filters): Get real-time counters from Redis
5. **Return Response**: HTTP 200 with:
   ```json
   {
     "status": "success",
     "total_conversations": N,
     "texting_conversations": N,
     "calling_conversations": N,
     "from_date": "...",
     "to_date": "..."
   }
   ```

**Error Handling:**
- S08 unavailable: HTTP 500 "Core Metrics Service unavailable"
- PARTNER_NOT_FOUND: HTTP 404 "Partner not found"
- DB_CONNECTION_ERROR: HTTP 500 "Database connection error"

---

### Flow 2: Customer Satisfaction Rate

**Background Processing (A17a Event Consumer):**

1. **Service Startup - Initial Data Load**:
   - Call A17b Method API to get current satisfaction distribution from S08
   - Send RabbitMQ request via queue `s14_s08_requests_queue`
   - Method: `get_partner_satisfaction_distribution` with this partner's `partner_id`
   - Wait for response from queue `s14_s08_responses_queue`
   - Initialize satisfaction counters in metrics database:
     - `satisfaction_1`, `satisfaction_2`, `satisfaction_3`, `satisfaction_4`, `satisfaction_5`
     - `total_ratings`
   - Calculate and store initial `average_rating`
   - Cache initial data in Redis
   - Handle errors:
     - "PARTNER_NOT_FOUND": Initialize all counters to 0
     - "NO_DATA_FOUND": Initialize all counters to 0
     - "DB_CONNECTION_ERROR": Retry with backoff

2. **Process `conversation_satisfaction_change_by_partner` Event**:
   - Validate payload: `conversation_id`, `partner_id`, `old_satisfaction`, `new_satisfaction`, `updated_at`
   - Verify `partner_id` matches this Partner's ID
   - **Update satisfaction distribution:**
     - If `old_satisfaction` exists (rating changed): Decrement `satisfaction_[old_value]` counter
     - Increment `satisfaction_[new_value]` counter (1-5 stars)
   - Update `total_ratings` count
   - **Recalculate average rating:**
     ```
     average_rating = (1×satisfaction_1 + 2×satisfaction_2 + 3×satisfaction_3 + 4×satisfaction_4 + 5×satisfaction_5) / total_ratings
     ```
   - Persist to database and update Redis cache

**On-Demand Query (H30.2: `GET /api/v1/partner/metrics/satisfaction-rate`):**

1. **Authenticate Request**: Validate JWT token for Partner Portal
2. **Validate Query Parameters**: Parse `from_date`, `to_date` (optional)
3. **Query S08 via A17b Method API** (if date filters specified):
   - Method: `get_partner_satisfaction_distribution` with `partner_id`
   - Handle "NO_DATA_FOUND": return HTTP 200 with empty distribution
4. **Retrieve from Cache** (if no date filters): Get cached satisfaction data
5. **Calculate Satisfaction Rate**:
   ```
   satisfied_customers = satisfaction_3 + satisfaction_4 + satisfaction_5
   satisfaction_rate_percentage = (satisfied_customers / total_ratings) × 100
   ```
6. **Return Response**: HTTP 200 with:
   ```json
   {
     "status": "success",
     "total_conversations": N,
     "satisfaction_distribution": {...},
     "average_rating": X.XX,
     "from_date": "...",
     "to_date": "..."
   }
   ```

**Error Handling:**
- NO_DATA_FOUND: HTTP 200 with empty distribution, average_rating = 0
- S08 unavailable: HTTP 500 "Core Metrics Service unavailable"
- PARTNER_NOT_FOUND: HTTP 404 "Partner not found"

---

### Flow 3: Partner Offload Rate

**Background Processing (A17a Event Consumer):**

1. **Service Startup - Initial Data Load**:
   - Call A17b Method API to get current conversation statistics from S08
   - Method: `get_partner_conversation_statistics` with `partner_id` (same as Flow 1)
   - Extract: `total_conversations`, `ai_failed_conversations`, `offloaded_conversations`
   - Initialize offload metrics in database:
     - `ai_failed_conversations` (conversations forwarded to this partner)
     - `offloaded_conversations` (conversations handled by AI before reaching partner)
   - Calculate initial `offload_rate_percentage`:
     ```
     offload_rate_percentage = (offloaded_conversations / total_conversations) × 100
     ```
   - Cache initial data in Redis
   - Note: This uses the same initial data load as Flow 1, can be done in parallel

2. **Track Offload Metrics via Events**:
   - All conversation events include offload status implicitly
   - When conversation starts (`conversation_start_by_partner`):
     - This indicates conversation was forwarded to partner (AI failed)
     - Increment `ai_failed_conversations` counter
   - Calculate continuously:
     ```
     offloaded_conversations = total_conversations_served_by_AI (from partner perspective)
     offload_rate = (offloaded_conversations / total_conversations) × 100
     ```
   - Note: For Partner metrics, "offloaded" means conversations the AI handled successfully before forwarding
   - Batch persist to database (every 10 seconds OR 100 events)

**On-Demand Query (H30.3: `GET /api/v1/partner/metrics/offload-rate`):**

1. **Authenticate Request**: Validate JWT token for Partner Portal
2. **Validate Query Parameters**: Parse `from_date`, `to_date` (optional)
3. **Query S08 via A17b Method API** (if date filters specified):
   - Method: `get_partner_conversation_statistics` with `partner_id`
   - Extract: `total_conversations`, `ai_failed_conversations`, `offloaded_conversations`
4. **Retrieve from Cache** (if no date filters): Get cached offload metrics
5. **Calculate Offload Rate**:
   ```
   offload_rate_percentage = (offloaded_conversations / total_conversations) × 100
   ```
   - Handle edge case: if `total_conversations` = 0, return `offload_rate_percentage` = 0
6. **Return Response**: HTTP 200 with:
   ```json
   {
     "status": "success",
     "total_conversations": N,
     "ai_failed_conversation": N,
     "offloaded_conversations": N,
     "offload_rate_percentage": XX.XX,
     "from_date": "...",
     "to_date": "..."
   }
   ```

**Error Handling:**
- S08 unavailable: HTTP 500 "Core Metrics Service unavailable"
- PARTNER_NOT_FOUND: HTTP 404 "Partner not found"

---

### Critical Error Handling (Applies to All Flows)

**RabbitMQ Connection Lost:**
- Log error with timestamp
- Attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, max 60s)
- Buffer events in memory (max 5,000 events) during disconnection
- Process buffered events after reconnection
- Set health endpoint to unhealthy

**Database Connection Lost:**
- Attempt reconnection (3 attempts, 5s delay)
- Use Redis cache for read operations during outage
- Buffer writes in memory (max 3,000 operations)
- Return HTTP 503 if buffer full
- Set health endpoint to unhealthy

**Redis Cache Unavailable:**
- Log warning (non-critical)
- Fall back to direct database queries
- Performance degradation expected
- Continue normal operations

**S08 Core Metrics Service Unavailable:**
- Return HTTP 500 with specific error message
- Implement circuit breaker pattern:
  - After 5 consecutive failures: open circuit for 30 seconds
  - Return cached data if available
  - After 30s: attempt half-open (single request)
  - Close circuit if request succeeds

**Invalid Event Payload:**
- Log validation error with full event details
- Continue processing other events (do not crash)
- Increment `invalid_events_counter` metric
- Alert if invalid_events_counter > 50/hour

**Partner ID Mismatch:**
- Ignore events with partner_id not matching this Partner's ID
- Log warning for debugging purposes
- Do not increment error counters

## This Service's APIs

This service exposes the following APIs:

### Event Consumer APIs (Background Processing)

**A17a - Core Metrics Events**
[A17](../../api_groups/A17a.md) - Consumes real-time events from S08 Core Metrics Service (RabbitMQ)
  - Event Queue: `s08_events_queue`
  - Events consumed (filtered by partner_id):
    - `conversation_start_by_partner` - Track new conversations for this partner
    - `conversation_changed_status_by_partner` - Track conversation state changes
    - `conversation_satisfaction_change_by_partner` - Track satisfaction ratings

### Method Call APIs (Request/Response via RabbitMQ)

**A17b - Core Metrics Methods**
[A17](../../api_groups/A17b.md) - Calls S08 to retrieve partner-specific statistics (RabbitMQ)
  - Request Queue: `s14_s08_requests_queue`
  - Response Queue: `s14_s08_responses_queue`
  - Methods used:
    - `get_partner_conversation_statistics` - Get conversation totals and status counts for this partner
    - `get_partner_satisfaction_distribution` - Get satisfaction rating distribution for this partner

### HTTP API for Partner Portal (H30)

[H30](../../api_groups/H30.md) - Exposes metrics data to Partner Portal (HTTP/REST)
  - **H30.1**: `GET /api/v1/partner/metrics/conversations` - Conversation statistics (total/texting/calling)
  - **H30.2**: `GET /api/v1/partner/metrics/satisfaction-rate` - Satisfaction distribution and average rating
  - **H30.3**: `GET /api/v1/partner/metrics/offload-rate` - Partner-specific offload rate percentage









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

    The class is [located in this file](../../app/services/MessageQueueService.py).

    An example of using this class [is given here](../MessageQueueService-usage-example.py).

    Also, for multithreading, only use the scheme in that file.
    Any other use of multithreading, if necessary, must strictly
    look for hazards - use locks and other synchronization primitives
    where appropriate.

- If this service needs to expose HTTP API(s), use Flask.

- The program entry point is [in this file](../../app/__main__.py).
