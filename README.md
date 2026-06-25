# # Virtual Sales Development Representative (vSDR) — Representante de Vendas Virtual

Sistema de CRM + "SDR" virtual com IA, composto por três apps:

| App | Descrição | Porta padrão |
|---|---|---|
| `srdbackend` | API REST (Express + MongoDB) + agente LangGraph | 3000 |
| `sdrfrontend` | Cockpit do SDR (React/Vite) | 5173 |
| `sdragentui` | Chat Frontent do SDR virtual (React/Vite) | 5174 |

---

![Screen shot1](Agent0.png)
![Screen shot2](Agent1.png)

---

## Tecnologias

- MongoDB Atlas Database
- Atlas Vector Search, para RAG com Auto Embeddings
- Agent com Langgraph
- Implementação de Memória

---

## Pré-requisitos

- Node.js 18+
- MongoDB Atlas (necessário para o vector search — ver passo 6)
- Chave de API da OpenAI

---

## 1. Configurar o arquivo `.env`

Dentro de `srdbackend/`, copie o arquivo de exemplo e preencha os valores:

```bash
cp srdbackend/.env.example srdbackend/.env
```

Edite `srdbackend/.env`:

```env
PORT=3000

# String de conexão do MongoDB Atlas (ex.: mongodb+srv://user:pass@cluster.mongodb.net/)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/

# Nome do banco de dados
MONGODB_DB_NAME=sdr_crm

# Chave da API da OpenAI
OPENAI_API_KEY=sk-...

# Modelo usado pelo SDR Virtual (opcional — padrão: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

---

## 2. Instalar dependências

Execute em cada pasta:

```bash
cd srdbackend  && npm install
cd ../sdrfrontend && npm install
cd ../sdragentui  && npm install
```

---

## 3. Popular o banco (seed minimal)

Com o backend configurado e o MongoDB acessível, rode o seed reduzido a partir de `srdbackend/`:

```bash
cd srdbackend
npm run seed:minimal
```

Isso insere 2 produtos (Plano Starter e Plano Pro), 2 leads, 2 contatos e 2 tarefas de exemplo, limpando qualquer dado anterior nessas coleções.

---

## 4. Iniciar o backend

```bash
cd srdbackend
npm start          # produção
# ou
npm run dev        # com hot-reload (nodemon)
```

API disponível em `http://localhost:3000`.  
Swagger UI disponível em `http://localhost:3000/api-docs`.

---

## 5. Iniciar o frontend (cockpit SDR)

```bash
cd sdrfrontend
npm run dev
```

Acesse `http://localhost:5173`.

---

## 6. Iniciar o SDR Agent UI (chat)

```bash
cd sdragentui
npm run dev
```

Acesse `http://localhost:5174`.

---

## 7. Criar o índice vetorial no MongoDB Atlas

O agente usa `$vectorSearch` com geração automática de embeddings (autoEmbed) no Atlas. O índice precisa ser criado manualmente uma única vez.

**No MongoDB Atlas, acesse:** `Data Services → <seu cluster> → Browse Collections → sdr_crm → knowledge_base → Search Indexes → Create Index`

Selecione **Atlas Vector Search** e use a definição JSON abaixo:

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

**Nome do índice:** `autoembed_index1`  
**Coleção:** `knowledge_base`

> O índice só pode ser criado depois que a coleção `knowledge_base` existir. Se ela ainda não existir após o seed, crie pelo menos um chunk primeiro (passo 8) e então crie o índice.

---

## 8. Extrair texto do PDF e gerar chunks (via frontend)

Esta etapa popula a coleção `knowledge_base` com o conteúdo dos produtos, que o SDR virtual usa para responder perguntas detalhadas via RAG.

1. Acesse o frontend em `http://localhost:5173`.
2. Navegue até a página **Produtos**.
3. Para cada produto que tenha um PDF cadastrado no campo `pdf`:
   - Clique em **Extrair Texto** — o backend baixa o PDF da URL e salva o texto extraído no campo `contents` do produto.
   - Após a extração concluir (toast de sucesso), clique em **Chunk Text** — o backend divide o texto em trechos e salva cada um como documento na coleção `knowledge_base`.
4. Repita para todos os produtos desejados.

> O botão **Chunk Text** fica desabilitado enquanto o texto não for extraído. Execute sempre "Extrair Texto" primeiro.

Depois que os chunks estiverem na `knowledge_base` e o índice vetorial estiver ativo, o SDR virtual passará a usar a ferramenta `buscar_informacoes_produto` para consultar a base antes de responder perguntas detalhadas sobre os produtos.
