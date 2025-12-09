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

- **S13. Partner Consultation Service**: **This service is responsible for accepting consultation handover requests from Telcenter Core and answering them. Besides, it manages conversation history and stores all conversation data into Conversation DB**
- **S12. Partner Knowledge Update Service**: **This service is responsible for managing knowledge data updates within the Partner system and submitting them to Telcenter Core for validation. It stores all partner knowledge update data into Partner Knowledge Update DB.**
- **S10. Partner Employee Identity Service**: **This service is responsible for managing employee identities of Telcenter Partner. It handles employee account registration, authentication, update, deletion. Additionally, it stores all employee data into Partner Employee Identity DB.**
- **S15. File Importing AI Agent**: **This service is responsible for automating the data entry process. Instead of manually inputting each knowledge item, employees simply need to upload document files. It utilizes an AI Agent to parse, extract, and restructure the information from these files.**
- **S11. Partner Local Knowledge Service**: **This service is responsible for managing the local knowledge repository of the Partner system. It receives structured data then store them to the Partner Local Knowledge DB**

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

### **S13. Partner Consultation Service**
[A17](../api_groups/A17.md)

### **S12. Partner Knowledge Update Service**
[A16](../api_groups/A16.md)

### **S10. Partner Employee Identity Service**
[A14](../api_groups/A14.md)

### **S15. File Importing AI Agent**
[A13](../api_groups/A13.md)

### **S11. Partner Local Knowledge Service**
[A15](../api_groups/A15.md)





## The Flow

**{{DESCRIBE_THE_STEPS_FROM_1_TO_N}}**

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
