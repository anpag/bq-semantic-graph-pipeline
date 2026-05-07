# Dataform Property Graph Pipeline

This Dataform project manages the schema creation, data transformation, and AI extraction pipelines for the Knowledge Hub in BigQuery.

## Directory Structure

To keep the pipeline scalable and collaborative, our `.sqlx` definitions are strictly organized by phase/use-case:

```text
dataform/
├── workflow_settings.yaml     # Project configuration, database, schemas, and Vertex cache variables
└── definitions/
    ├── 00_setup/              # Foundational Master Records, Graph Tables, and Property Graph DDL
    ├── 02_ai_router/          # AI classification of raw unstructured documents
    └── 03_tacit_extraction/   # The Chunk-Extract-Synthesize pattern for generic Triples extraction
```

## The `00_setup/` Directory

This directory contains the core Dataform `operations` that provision the foundational structures in BigQuery. It must run successfully before any data ingestion occurs.

### Core Architecture & Connections
*   **`01_master_record.sqlx`**: Creates the `document_master_record` table. This is the cornerstone of data lineage, tracking every file's UUID, submitter, original GCS URI, and processing status.
*   **`raw_landing_objects.sqlx`**: Creates an external Object Table connected to the GCS `01_landing` bucket via our dedicated Cloud Resource connection. This allows BigQuery to natively access raw unstructured files.
*   **`gemini_model.sqlx`** & **`embedding_model.sqlx`**: Provisions the remote Vertex AI models referencing the Cloud Resource connection.

### The Unified Graph Schema
Instead of hardcoding domain-specific tables (like 'molecules' or 'experiments'), this architecture uses a highly flexible Triples structure driven by a cached ontology.
*   **`global_nodes.sqlx`**: Stores every extracted entity. Fields include `node_id`, `name`, `ontology_class` (e.g., 'Assay', 'Disease'), a generic JSON `properties` column, and an `embedding` array for Vector Search.
*   **`global_edges.sqlx`**: Stores every extracted relationship. Fields include `edge_id`, `source_node_id`, `target_node_id`, `relationship_type` (e.g., 'investigates'), and `evidence_insight`.
*   **`kg_graph.sqlx`**: Executes the `CREATE PROPERTY GRAPH` statement. This file overlays the strict ISO GQL schema exclusively on the `global_nodes` and `global_edges` tables.

## The AI Pipelines

### The AI Router (`02_ai_router/`)
*   **`route_landing_files.sqlx`**: This is the core automated ingestion engine. It finds all new files in the `raw_landing_objects` table, passes them natively to the Gemini model using `AI.GENERATE`, and writes the JSON metadata extraction directly into the `document_master_record`.

### Generic Triples Extraction (`03_tacit_extraction/`)
*   **`page_level_extractions.sqlx`**: Resolves the "Lost in the Middle" LLM hallucination issue. It maps over the document page-by-page, securely passing the cached `kg.owl` ontology to Gemini. It forces Gemini to output unstructured text as a strict JSON array of nodes and edges (Triples).
*   **`insert_global_graph.sqlx`**: Synthesizes the extracted JSON. It generates deterministic MD5 hashes to prevent node duplication, computes Vector Embeddings via `text-embedding-005`, and inserts the finalized graph into `global_nodes` and `global_edges`.

---

## Local Execution via Command Line

If you are developing locally, you can use the Dataform CLI to compile and run the pipelines.

### Prerequisites
1.  Ensure you have Node.js installed.
2.  Install the Dataform CLI: `npm install -g @dataform/cli`
3.  Authenticate your Google Cloud CLI: `gcloud auth application-default login`

### Commands

**1. Compile the Project:**
Validates syntax and resolves the dependency graph without executing anything in BigQuery.
```bash
dataform compile
```

**2. Dry Run:**
Generates the compiled SQL and validates it against BigQuery without modifying tables.
```bash
dataform run --dry-run
```

**3. Execute the Full Pipeline:**
Runs all operations, table creations, and views against your configured BigQuery project.
```bash
dataform run
```