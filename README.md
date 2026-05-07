# BQ Semantic Graph Pipeline

A reference architecture for dynamically extracting unstructured documents into a native BigQuery Property Graph, utilizing BigQuery ML (`AI.GENERATE`) and Vertex AI Context Caching.

## Architecture Overview

This repository demonstrates how to build a highly scalable, "schema-less" extraction pipeline natively within Google Cloud. By relying entirely on Dataform, BigQuery Object Tables, and Gemini 2.5 Pro, this pipeline avoids the complexity of external Python orchestration (e.g., Airflow) and rigid parsing scripts.

Instead of hardcoding domain-specific BigQuery tables (e.g., `molecules`, `assays`), the pipeline extracts **Generic Graph Triples** (Subject-Predicate-Object). The structure of the database never changes, but the semantic *vocabulary* expands infinitely based on an open-source ontology cached in Vertex AI.

### Technical Stack
1. **Google Cloud Storage (GCS) + BigQuery Object Tables:** Provides native SQL access to raw, unstructured binary files (PDFs, PPTs) as they land.
2. **Dataform:** Orchestrates the extraction, handles idempotent transformations, and executes the final `CREATE PROPERTY GRAPH` DDL.
3. **Vertex AI Context Caching:** Loads the Pistoia Alliance Process Graph Ontology (PGO) into cache, bounding the LLM's extraction vocabulary without consuming excessive prompt tokens per page.
4. **BigQuery ML (`AI.GENERATE`):** Executes Gemini 2.5 Pro directly over the GCS URIs to extract the Triples.
5. **BigQuery ML (`ML.GENERATE_EMBEDDING`):** Generates `text-embedding-005` vectors for every extracted node, enabling downstream Hybrid GQL + Vector Search.

## Repository Structure

```text
.
├── docs/
│   └── PROMPTS_AND_ARCHITECTURE.md    # Deep dive on the SQL prompts and Vertex caching mechanics
├── knowledge_hub/
│   ├── DEPLOYMENT_RUNBOOK.md          # Step-by-step gcloud & dataform deployment guide
│   ├── ontology/
│   │   └── kg_distilled.md            # The Pistoia PGO ontology used to bound the LLM
│   └── dataform/
│       ├── workflow_settings.yaml     # Environment variables (Project ID, Cache ID)
│       └── definitions/               # The core SQLX pipeline
│           ├── 00_setup/              # Graph tables, models, and Object Table provisioning
│           ├── 02_ai_router/          # Document-level classification
│           └── 03_tacit_extraction/   # Map-Reduce page-level Triples extraction
```

## The Pipeline Lifecycle

1. **Ingestion:** An unstructured PDF is uploaded to the GCS landing bucket. The BigQuery Object Table `raw_landing_objects` immediately exposes its URI.
2. **AI Routing:** The Dataform router passes the URI to `AI.GENERATE`. Gemini classifies the document against the cached ontology (e.g., `Clinical_study` vs `Assay` report) and registers it in the `document_master_record`.
3. **Chunking & Extraction (Map):** To avoid the "Lost in the Middle" syndrome on large 100+ page PDFs, Dataform `CROSS JOIN`s the document URI with a page array. `AI.GENERATE` evaluates *each page individually*, outputting strict JSON arrays of `extracted_nodes` and `extracted_edges` derived from the Pistoia ontology.
4. **Synthesis & Hashing (Reduce):** `insert_global_graph.sqlx` unnests the arrays. It uses `TO_HEX(MD5(...))` to generate deterministic UUIDs, ensuring that multiple mentions of the same entity (e.g., "Toluene") across different pages resolve to a single Node ID.
5. **Property Graph Initialization:** `kg_graph.sqlx` applies the strict ISO GQL schema over the generic `global_nodes` and `global_edges` tables.

## Next Steps for Engineers
* Read the **[Deployment Runbook](knowledge_hub/DEPLOYMENT_RUNBOOK.md)** to provision the GCP resources and execute the Dataform run.
* Review the **[Prompts & Architecture Guide](docs/PROMPTS_AND_ARCHITECTURE.md)** to understand how Vertex Context Caching is injected into the BigQuery SQL.