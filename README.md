```markdown
# Carvalima Freight Quoting Agent (NestJS + LangGraph Supervisor)

## Overview

This project implements an intelligent freight quoting agent simulating the workflow of Carvalima Transportes. It utilizes the **LangGraph Supervisor** pattern to orchestrate specialized AI agents built with LangChain, all within a robust **NestJS** backend framework. Conversation state is managed and persisted using **MongoDB**.

The primary goal is to create an abstraction layer where a user can interact naturally to get a freight quote, even if they don't provide information perfectly sequentially. The supervisor manages the conversation flow, delegates tasks to appropriate agents (like checking coverage, validating customer status, generating quotes, handling negotiation), gathers necessary information, and uses mocked tools to simulate interactions with external Carvalima APIs (Coverage, Quoting, Booking, CRM Logging).

This project serves as a proof-of-concept demonstrating how to build complex, stateful agentic workflows using modern AI and backend technologies.

## Features

*   **Supervisor Pattern:** Uses LangGraph's `createSupervisor` for intelligent workflow orchestration.
*   **Specialized Agents:** Implements distinct agents for specific tasks (Coverage Check, Customer Validation, Quote Generation, Negotiation).
*   **NestJS Backend:** Built on the scalable and modular NestJS framework.
*   **Stateful Conversations:** Persists conversation history in MongoDB, allowing for multi-turn interactions specific to a user session.
*   **Mocked Tools:** Simulates interactions with external Carvalima APIs for testing purposes.
*   **Dockerized:** Both the NestJS application and the MongoDB database are containerized using Docker Compose for easy setup and consistent environments.
*   **Configurable:** Uses `.env` file for managing environment variables like API keys and database URIs.

## Prerequisites

Before running this project, ensure you have the following installed:

*   **Node.js:** LTS version (e.g., v20.x recommended)
*   **npm:** (Comes bundled with Node.js)
*   **Docker:** Latest stable version
*   **Docker Compose:** (Usually included with Docker Desktop)
*   **Git:** (For cloning the repository)
*   **OpenAI API Key:** You need an API key from OpenAI to power the LLMs.

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    **Edit the `.env` file** and add your credentials/settings:
    ```.env
    # Required: Your OpenAI API Key
    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

    # MongoDB Connection URI
    # IMPORTANT: Use 'mongo_chat_history' hostname when running with docker-compose
    MONGO_URI=mongodb://mongo_chat_history:27017/carvalima_chat_history

    # --- Optional: For MongoDB Authentication (if configured in docker-compose.yml) ---
    # MONGO_INITDB_ROOT_USERNAME=youruser
    # MONGO_INITDB_ROOT_PASSWORD=yourpassword
    # If using auth, update MONGO_URI:
    # MONGO_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo_chat_history:27017/carvalima_chat_history?authSource=admin
    ```

## Running the Application

There are two primary ways to run the application:

**1. Using Docker Compose (Recommended)**

This method runs both the NestJS application and the MongoDB database in containers, ensuring a consistent environment.

*   **Build Images (Optional):** If you modify the `Dockerfile` or related files, rebuild the images:
    ```bash
    docker-compose build
    ```
*   **Start Services:** Start the application and database in detached mode:
    ```bash
    docker-compose up -d
    ```
*   **View Logs:** Tail the logs for the application or database:
    ```bash
    docker-compose logs -f app         # View NestJS app logs
    docker-compose logs -f mongo_chat_history # View MongoDB logs
    ```
*   **Stop Services:** Stop and remove the containers:
    ```bash
    docker-compose down
    ```
    *(To also remove the persisted MongoDB data volume, use `docker-compose down -v`)*

The application will be accessible at `http://localhost:3000`.

**2. Running Locally (Requires Separate MongoDB)**

You can run the NestJS application directly on your machine, but you'll need a MongoDB instance running separately (either via Docker manually or installed locally).

*   **Start MongoDB:** If you don't have a local MongoDB, you can start one using Docker:
    ```bash
    docker run -d --name mongo_chat_dev -p 27017:27017 -v mongo-chat-data:/data/db mongo:latest
    ```
    *(Make sure the `mongo-chat-data` volume doesn't conflict if also using compose)*
*   **Update `.env`:** Change `MONGO_URI` to connect to `localhost`:
    ```.env
    # ... other vars
    MONGO_URI=mongodb://localhost:27017/carvalima_chat_history
    # ...
    ```
*   **Start NestJS App:**
    ```bash
    npm run start:dev
    ```

The application will be accessible at `http://localhost:3000`.

## Testing the Endpoint Manually

You can interact with the agent using tools like `curl` or Postman/Insomnia. The key is to simulate a continuous conversation by using the `X-Session-ID` header.

*   **Endpoint:** `POST /chat`
*   **URL:** `http://localhost:3000/chat` (when running via Docker Compose or locally mapped)
*   **Headers:**
    *   `Content-Type: application/json`
    *   `X-Session-ID: <your_unique_session_id>` (e.g., `my-test-session-1`)
*   **Body (JSON):**
    ```json
    {
      "message": "Your message to the agent"
    }
    ```

**Example Conversation Flow using `curl`:**

```bash
# Turn 1: Start conversation (use a unique session ID)
SESSION_ID="test-$(date +%s)" # Example: create a unique ID
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: $SESSION_ID" \
     -d '{"message": "Ola, quero cotar um frete"}' \
     http://localhost:3000/chat

# Turn 2: Provide CEPs (use the SAME session ID)
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: $SESSION_ID" \
     -d '{"message": "CEP origem 74000000 e destino 79000000"}' \
     http://localhost:3000/chat

# Turn 3: Provide Payer CNPJ (use the SAME session ID)
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: $SESSION_ID" \
     -d '{"message": "CNPJ pagador 12345678000199"}' \
     http://localhost:3000/chat

# ... continue the conversation using the SAME X-Session-ID header ...

# Start a NEW conversation with a different ID
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: new-convo-abc" \
     -d '{"message": "Quanto custa?"}' \
     http://localhost:3000/chat
```

**Note:** Check the application logs (`docker-compose logs -f app` or the console where `npm run start:dev` is running) to see the internal workflow, agent routing, and tool calls.

## Project Structure

```
.
├── dist/                 # Compiled JavaScript output (from build)
├── node_modules/         # Node.js dependencies
├── src/                  # Source code
│   ├── app.module.ts     # Root application module
│   ├── main.ts           # Application entry point
│   ├── chat/             # Handles HTTP requests and state management
│   │   ├── dto/          # Data Transfer Objects for validation
│   │   ├── schemas/      # Mongoose schemas (conversation.schema.ts)
│   │   ├── chat.controller.ts # API endpoint definition
│   │   ├── chat.module.ts   # Chat feature module
│   │   └── chat.service.ts  # Business logic, MongoDB interaction
│   ├── common/           # Shared utilities/interfaces (if any)
│   └── langchain/        # LangChain/LangGraph specific components
│       ├── agents/       # Agent definitions (carvalima.agents.service.ts)
│       ├── supervisor/   # Supervisor definition (carvalima.supervisor.service.ts)
│       ├── tools/        # Tool definitions (carvalima.tools.service.ts)
│       └── langchain.module.ts # LangChain feature module
├── .dockerignore         # Files to ignore during Docker build
├── .env                  # Environment variables (GITIGNORED)
├── .env.example          # Example environment file
├── .eslintrc.js          # ESLint configuration
├── .gitignore            # Files ignored by Git
├── .prettierrc           # Prettier code formatting rules
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Dockerfile for building the NestJS app image
├── nest-cli.json         # NestJS CLI configuration
├── package-lock.json     # Exact dependency versions
├── package.json          # Project dependencies and scripts
├── README.md             # This file
└── tsconfig.build.json   # TypeScript build configuration
└── tsconfig.json         # TypeScript base configuration
```

## Technology Stack

*   **Backend Framework:** NestJS (v10+)
*   **AI Orchestration:** LangChain.js / LangGraph (Supervisor Pattern)
*   **LLM:** OpenAI (Configured via API Key, uses `gpt-4o-mini` by default)
*   **Database:** MongoDB (for conversation state persistence)
*   **ODM:** Mongoose (for MongoDB interaction within NestJS)
*   **Containerization:** Docker, Docker Compose
*   **Language:** TypeScript

## State Management

HTTP is stateless. To enable multi-turn conversations, this application persists the entire message history for each user session in a MongoDB database.

*   A unique `sessionId` (obtained from the `X-Session-ID` HTTP header) identifies each conversation.
*   The `ChatService` retrieves the message history for the given `sessionId` before invoking the LangGraph workflow.
*   The full history is passed to the `SupervisorService`.
*   After the workflow completes, the `ChatService` saves the updated message list back to the MongoDB document associated with the `sessionId`.

**Note:** The current MongoDB implementation is basic. For production, consider adding TTL indexes to automatically expire old conversations or implementing more robust session handling.

## Limitations & Future Work

*   **Mocked Tools:** All "Carvalima API" interactions are simulated by mocked tools in `carvalima.tools.service.ts`. Real-world implementation requires integrating with the actual Carvalima REST APIs.
*   **Human Handoff:** The `transfer_to_human` flag mentioned in scenarios is not connected to a real handoff system. The workflow currently ends after logging.
*   **Error Handling:** Mocked tools don't simulate the full range of potential API errors. Real API integration would need more comprehensive error handling.
*   **Data Validation:** Mocked tools have basic validation (e.g., value/weight limits). Real integration needs more robust validation matching API specs (e.g., valid merchandise codes, dimension checks).
*   **Missing Logic:** Features like Cubagem calculation, specific merchandise code validation, CIF/FOB checks, risk area checks, etc., are not implemented in the mocks or agent logic.
*   **Basic Session ID:** Using a simple header for session ID is suitable for testing but not secure or robust enough for production.
*   **Structured Output:** The agent currently responds in natural language. Implementing structured JSON output for external consumption (e.g., Sacflow) would require modifications.
```
