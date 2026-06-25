# Virtual Sales Representative — AI-Powered SDR Agent

CRM + AI virtual SDR system, made up of three apps:

| App | Description | Default port |
|---|---|---|
| `srdbackend` | REST API (Express + MongoDB) + LangGraph agent | 3000 |
| `sdrfrontend` | SDR cockpit (React/Vite) | 5173 |
| `sdragentui` | SDR virtual chat (React/Vite) | 5174 |

---

![Screen shot1](Agent0.png)
![Screen shot2](Agent1.png)

---

## Technologies

- MongoDB Atlas Database
- Atlas Vector Search, para RAG com Auto Embeddings
- Agent com Langgraph
- Implementação de Memória


---

## Prerequisites

- Node.js 18+
- MongoDB Atlas (required for vector search — see step 6)
- OpenAI API key

---

## 1. Configure the `.env` file

Inside `srdbackend/`, copy the example file and fill in your values:

```bash
cp srdbackend/.env.example srdbackend/.env
```

Edit `srdbackend/.env`:

```env
PORT=3000

# MongoDB Atlas connection string (e.g.: mongodb+srv://user:pass@cluster.mongodb.net/)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/

# Database name
MONGODB_DB_NAME=sdr_crm

# OpenAI API key
OPENAI_API_KEY=sk-...

# Model used by the SDR agent (optional — defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

---

## 2. Install dependencies

Run in each folder:

```bash
cd srdbackend  && npm install
cd ../sdrfrontend && npm install
cd ../sdragentui  && npm install
```

---

## 3. Seed the database (minimal seed)

With the backend configured and MongoDB reachable, run the minimal seed from `srdbackend/`:

```bash
cd srdbackend
npm run seed:minimal
```

This inserts 2 products (Starter Plan and Pro Plan), 2 leads, 2 contacts, and 2 sample tasks, clearing any previous data in those collections.

---

## 4. Start the backend

```bash
cd srdbackend
npm start          # production
# or
npm run dev        # with hot-reload (nodemon)
```

API available at `http://localhost:3000`.  
Swagger UI available at `http://localhost:3000/api-docs`.

---

## 5. Start the frontend (SDR cockpit)

```bash
cd sdrfrontend
npm run dev
```

Open `http://localhost:5173`.

---

## 6. Start the SDR Agent UI (chat)

```bash
cd sdragentui
npm run dev
```

Open `http://localhost:5174`.

---

## 7. Create the vector index on MongoDB Atlas

The agent uses `$vectorSearch` with Atlas autoEmbed (server-side embedding generation). The index must be created once manually.

**In MongoDB Atlas, go to:** `Data Services → <your cluster> → Browse Collections → sdr_crm → knowledge_base → Search Indexes → Create Index`

Select **Atlas Vector Search** and use the JSON definition below:

```json
{
  "fields": [
    {
      "type": "autoEmbed",
      "path": "chunk_text",
      "model": "voyage-4",
      "modality": "text"
    }
  ]
}
```

**Index name:** `autoembed_index1`  
**Collection:** `knowledge_base`

> The index can only be created after the `knowledge_base` collection exists. If it does not exist yet after seeding, generate at least one chunk first (step 8) and then create the index.

---

## 8. Extract PDF text and generate chunks (via frontend)

This step populates the `knowledge_base` collection with product content, which the SDR agent uses to answer detailed questions via RAG.

1. Open the frontend at `http://localhost:5173`.
2. Navigate to the **Products** page.
3. For each product that has a PDF URL set in the `pdf` field:
   - Click **Extrair Texto** (Extract Text) — the backend downloads the PDF from the URL and saves the extracted text in the product's `contents` field.
   - Once extraction completes (success toast), click **Chunk Text** — the backend splits the text into segments and saves each one as a document in the `knowledge_base` collection.
4. Repeat for all desired products.

> The **Chunk Text** button is disabled until text has been extracted. Always run "Extract Text" first.

Once the chunks are in `knowledge_base` and the vector index is active, the SDR agent will use the `buscar_informacoes_produto` tool to query the knowledge base before answering detailed product questions.
