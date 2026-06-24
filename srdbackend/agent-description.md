Act as an expert backend developer and AI engineer. Add a robust API endpoint into the current back-end  for a Virtual Sales Development Representative (SDR) agent. 

The API should process inbound customer messages, use an OpenAI LLM  to generate a helpful, sales-oriented response, and manage the lead's state in our database.

### 1. Core Objectives of the Virtual SDR:
- **Inbound Handling:** Greet and engage leads reaching out with questions about our product.
- **Product Discovery:** Answer initial questions about the product naturally and accurately.
- **Lead Qualification:** Assess if the lead fits our Ideal Customer Profile (ICP) and extract/estimate their budget.
- **Meeting Scheduling:** If qualified, suggest and coordinate scheduling a meeting with an Account Executive (AE).

### 2. Database & Collection Requirements:
You must use the following existing database collections to manage state and history:
1. **`leads` existing collection:** - Store and update lead details
2. **`contatos` existing collection:** - Log every interaction. 
3. **`tarefas` existing collection:** - At the end of a conversation (or when a major milestone is hit, like scheduling a meeting or marking a lead as disqualified), register a "next step" task (e.g., "AE to host discovery call", "Nurture sequence", "Manual follow-up").

### 3. API Architecture & Logic:
- Add a  `POST /api/v1/sdr/message` endpoint to the exising server
- **Payload:** Expects `{ lead_id: string, message: string }`. If `lead_id` is not provided, treat it as a brand-new inbound lead and generate a new record in the `lead` collection.
- **State Machine / Conversation Flow:**
  - **Step 1: Fetch Context:** Retrieve the lead's profile from `lead` and their conversation history from `contato`.
  - **Step 2: LLM Processing:** Prompt the LLM with the product context, the lead's history, and a strict system prompt directing it to qualify (ICP + budget) before steering toward booking a meeting.
  - **Step 3: Intent/Data Extraction:** Parse the LLM's structured thoughts or response to see if new data was uncovered (e.g., they revealed their budget or company size). Update the `lead` collection accordingly.
  - **Step 4: Check for Completion:** If the lead successfully books a meeting or is formally disqualified, trigger a function to create a record in the `tarefas` collection defining the exact next step.
- **Response:** Return the AI's verbal response to the client: `{ response: string, next_stage: string }`.

### 4. Technical Deliverables:
- Implement robust error handling (e.g., database connection failures, LLM timeouts).
- Provide the exact system prompt template used for the AI SDR to ensure it stays on track, maintains a professional yet friendly sales tone, and doesn't hallucinate product features.

Use the current srdbackend folder project structure.