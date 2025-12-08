# Telcenter Partner - File Importing AI Agent (S15)

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

Now, you are designing the **File Importing AI Agent** service, in Python.
This service is inside the **Telcenter Partner** system.

Here are the peer services that the **File Importing AI Agent** service may interact with:

- **S11 Partner Local Knowledge Service**: Sends file import requests and receives processed knowledge data
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

### S11 Partner Local Knowledge Service

[A32](../../api_groups/A32.md) - Receives file import requests from S11

### S14 Partner Metrics Service

[A13](../../api_groups/A13.md) - Report file processing and AI extraction metrics to S14

## The Flow

### Flow: Process File Import (via A32)

1. **Receive File Import Request** (via A32): S11 sends a file import request containing:
   - File content (base64 encoded or file path)
   - File type (Excel, PDF, Word)
   - Partner context and metadata

   - If the request contains a `file_reference` object with `storage: "seaweed"`, S15 MUST fetch the file directly from SeaweedFS using the supplied `file_id`/`file_url` before validation and extraction.
   - If the request provides `file_content_base64`, S15 should store the decoded file into SeaweedFS and include the resulting `file_reference` in processing logs/responses.

2. **Validate File Format**: Check that the file is readable and in a supported format

3. **Extract Raw Content**:
   - For Excel: Parse sheets, rows, columns using openpyxl
   - For PDF: Extract text and tables using PyPDF2 or pdfplumber
   - For Word: Extract text and tables using python-docx

4. **Identify Data Structure**: Use AI/ML to identify:
   - Column headers and their meanings (e.g., "Mã dịch vụ", "Giá", "Chu kỳ")
   - Data types (service codes, prices, dates, descriptions)
   - Relationships between fields
   - Vietnamese language patterns specific to telecom services

5. **Structure Data into DataFrame**: Transform extracted content into standardized format:
   ```json
   [
     {
       "Mã dịch vụ": "SD70",
       "Thời gian thanh toán": "Trả trước",
       "Giá (VNĐ)": 70000,
       "Chu kỳ (ngày)": 30,
       "4G tốc độ tiêu chuẩn/ngày": 1,
       // ... other fields
     },
     // ... more entries
   ]
   ```

6. **Validate Extracted Data**:
   - Check for missing required fields
   - Validate data types and formats
   - Check for inconsistencies
   - Ensure Vietnamese text is properly encoded

7. **Apply Data Quality Rules**:
   - Remove duplicates
   - Normalize text (trim whitespace, standardize casing)
   - Validate pricing and numeric values
   - Correct common OCR errors in Vietnamese text

8. **Generate Confidence Scores**: For each extracted field, provide confidence score indicating extraction accuracy

9. **Report Metrics** (via A13): Send processing metrics to S14 (processing time, confidence scores, error rates)

10. **Return Structured Data** (via A32 response): Send the structured dataframe back to S11

If it fails at any stage, the whole process fails.
That is, immediately return error with the
appropriate error message.

## This Service's APIs

This service exposes the following APIs:

- [A32](../../api_groups/A32.md) - RabbitMQ API to receive file import requests from S11
  - Request Queue: `file_import_requests`
  - Response Queue: `file_import_responses`

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

- File parsing libraries:
  - openpyxl or pandas for Excel files
  - PyPDF2 or pdfplumber for PDF files
  - python-docx for Word documents
  - tabula-py for extracting tables from PDFs

- AI/ML components:
  - Use OpenAI API or local LLM for intelligent content extraction
  - Use Vietnamese NLP models (e.g., PhoBERT) for text understanding
  - Implement pattern recognition for telecom service data formats
  - Use pandas for data manipulation and validation

- Data validation:
  - Use pydantic or marshmallow for schema validation
  - Implement custom validation rules for telecom-specific data
