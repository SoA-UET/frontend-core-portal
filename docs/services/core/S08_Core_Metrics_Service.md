# Telcenter Core - **S08. Metrics Service**

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

Now, you are designing the **S08. Metrics Service** service, in Python.
This service is inside the **Telcenter Core** system.

Here are the peer services that the **S08. Metrics Service** service may interact with. We will come up
with the flow of this service itself later.

- **S01. Consultation Service**: **The center of the Telcenter system, responsible for receiving and responding to customer messages. It manages the entire conversation lifecycle, orchestrates the flow between AI agents and consultant, and stores all interaction data including conversation history, content of messages, and customer reviews.**
- **S04. Customer Identity Service**: **This service is responsible for managing customer identities. It handles user registration, authentication, and profile management. Additionally, it stores all customer data into the Customer Identity DB.**
- **S07. Partner Management Service**: **This service if responsible for managing partner connection. It handles partner addition, update, deletion. Additionally, it stores all partner connection data in to the Partner Connection DB.**
- **S03. Knowledge Service**: **This service is responsible for managing entire knowledge that partner supplies. It stores all knowledge data into the Knowledge DB.**
- **S05. Knowledge Validator Service**: **This service is responsible for managing knowledge updates submitted by partner. It handles the workflow of reviewing, validating, rejecting these updates. Additionally, it stores all update data into Knowledge Updates DB**
- **S06. Core Employee Identity Service**: **This service is responsible for managing employee identities of Telcenter Core. It handles employee account addition, update, deletion. Additionally, it stores all employee data into Core Employee Identity DB.**

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

### **S01. Consultation Service**
[A03](../api_groups/A03.md)

### **S04. Customer Identity Service**
[A04](../api_groups/A04.md)

### **S07. Partner Management Service**
[A07](../api_groups/A07.md)

### **S03. Knowledge Service**
[A18](../api_groups/A18.md)

### **S05. Knowledge Validator Service**
[A05](../api_groups/A05.md)

### **S06. Core Employee Identity Service**
[A06](../api_groups/A06.md)


## The Flow
**{{DESCRIBE_THE_STEPS_FROM_1_TO_N}}**

1. The Data Ingestion Flow (RabbitMQ Consumers)
This flow runs continuously in background threads to process incoming events from peer services.

- Listen for Events: The service spawns worker threads to listen to new events from peer services via the configured RabbitMQ queues.

- Process Consultation Events (A03): When a message arrives from the Consultation Service (A03), the system validates the payload and performs the following metric calculations:

+ Calculate Active Concurrent Users: Determine the number of users currently receiving consultation by calculating the difference between the total start_conversation events and end_conversation events received (Active Count = Total Starts - Total Ends).

+ Calculate Customer Satisfaction Rate: Determine the percentage of satisfied users by taking the number of ratings where score >= 3 divided by the total number of ratings submitted.

+ alculate Global AI Deflection Rate: Determine the percentage of sessions successfully resolved by the AI Agent. This is calculated by counting conversations where the final_status is either "AI_AGENT_TEXTING" or "AI_AGENT_CALLING", divided by the total number of conversations.

+ Calculate AI Deflection Rate per Partner: Apply the deflection logic specific to each carrier. For example, to calculate for "Viettel", filter the dataset where partner_name is "Viettel", then take the count of conversations with status "AI_AGENT_TEXTING" or "AI_AGENT_CALLING" and divide it by the total conversations associated with that partner.

2. Store in Metrics DB.



If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

**{{CŨNG_CHỌN_CÁC_FILE_AXX_HOẶC_HXX_THÍCH_HỢP_LINK_VÀO_ĐÂY}}**



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
