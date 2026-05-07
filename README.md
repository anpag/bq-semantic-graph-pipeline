# BQ Semantic Graph Pipeline

A reference architecture for dynamically extracting unstructured documents into a native BigQuery Property Graph, utilizing BigQuery ML (`AI.GENERATE`) and Vertex AI Context Caching.

## Architecture Overview

This repository demonstrates how to build a highly scalable, "schema-less" extraction pipeline natively within Google Cloud. By relying entirely on Dataform, BigQuery Object Tables, and Gemini 2.5 Pro, this pipeline avoids the complexity of external Python orchestration (e.g., Airflow) and rigid parsing scripts.

Instead of hardcoding domain-specific BigQuery tables (e.g., `molecules`, `assays`), the pipeline extracts **Generic Graph Triples** (Subject-Predicate-Object). The structure of the database never changes, but the semantic *vocabulary* expands infinitely based on an open-source ontology cached in Vertex AI.

### Technical Stack
1. **Google Cloud Storage (GCS) + BigQuery Object Tables:** Provides native SQL access to raw, unstructured binary files (PDFs, PPTs) as they land.
2. **Dataform:** Orchestrates the extraction, handles idempotent transformations, and executes the final `CREATE PROPERTY GRAPH` DDL.
3. **Vertex AI Context Caching:** Loads the [Pistoia Alliance Process Graph Ontology (PGO)](https://github.com/Pistoia-Alliance-Inc/Pistoia-Alliance-PGO) into cache, bounding the LLM's extraction vocabulary without consuming excessive prompt tokens per page.
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

## Step-by-Step Pipeline Walkthrough

This section explains exactly how a raw PDF goes from being dropped in a bucket to becoming a fully traversable ISO GQL Property Graph in BigQuery.

### Step 1: Configuration & Raw Data Landing (`00_setup/`)
Before AI runs, the database needs to know where files live. We use a **BigQuery Object Table** (`raw_landing_objects.sqlx`) built over a GCS bucket. When a user drops a PDF into `gs://your-bucket/01_landing/`, a new row instantly appears in this SQL table containing the file's binary URI. BigQuery accesses this bucket securely using a Cloud Resource Connection.

### Step 2: The AI Router (`02_ai_router/`)
Once BigQuery knows a new PDF exists, it categorizes it entirely in SQL. The `route_landing_files.sqlx` script uses BigQuery ML's native `AI.GENERATE` function combined with `OBJ.MAKE_REF(uri)` to pass the raw binary PDF directly to Gemini 2.5 Pro. Gemini determines the overarching ontology class of the document (e.g., `Experiment_Report` vs `Inventory_Log`) and logs the result in the `document_master_record` tracking table.

### Step 3: Generic Triples Extraction (The "Map" Phase)
Large scientific documents (50+ pages) have too much text to feed into an LLM at once due to context dilution. We solve this natively in Dataform (`page_level_extractions.sqlx`) using a Map-Reduce pattern.
1. **Map (Chunking):** We `CROSS JOIN` the document URI to generate a distinct database row for every single page.
2. **Extraction:** We fire parallel `AI.GENERATE` requests for each page row. Crucially, we inject a Vertex AI Context Cache ID representing the Pistoia Graph Ontology (PGO). The LLM evaluates only that specific page and outputs a strict JSON array of generic Triples (`extracted_nodes` and `extracted_edges`) bounded by the cached ontology vocabulary.
3. **Open Knowledge:** If the LLM finds tacit knowledge that doesn't fit the strict ontology, it routes it to an `unbound_insights` array, preventing knowledge loss.

### Step 4: Graph Synthesis & Embeddings (The "Reduce" Phase)
We now have a table filled with raw JSON arrays for every page. `insert_global_graph.sqlx` flattens this into the actual graph nodes.
1. **Deduplication:** We UNNEST the arrays. If Gemini finds "Toluene" on page 5 and page 20, we generate a deterministic MD5 hash (`TO_HEX(MD5(UPPER(node_name)))`) so both mentions resolve to the exact same UUID.
2. **Embeddings:** Before inserting the Node into the `global_nodes` table, we pass its properties through `ML.GENERATE_EMBEDDING` (using `text-embedding-005`). This generates a semantic vector array for the node.

### Step 5: The Property Graph (ISO GQL Overlay)
To traverse the data efficiently, we define a Property Graph overlay on top of our flat tables (`kg_graph.sqlx`). 
We map `global_nodes` as the vertices and `global_edges` as the lines connecting them, explicitly binding the `source_node_id` and `target_node_id` foreign keys.

Downstream applications can now perform a **Hybrid Vector + GQL Query**:
```sql
SELECT g.description, g.ontological_relationship
FROM GRAPH_TABLE(
    `kg_graph`
    MATCH (a:`global_nodes`)-[:CONNECTS]->(e:`global_nodes`)
    WHERE a.node_id IN (
        SELECT base.node_id FROM VECTOR_SEARCH(TABLE `global_nodes`, 'embedding', ...)
    )
) g
```
This instantly finds the most semantically relevant Node via Vector Search, and then uses ISO GQL to strictly traverse all connected experiments, diseases, or devices.

## Next Steps for Engineers
* Read the **[Deployment Runbook](knowledge_hub/DEPLOYMENT_RUNBOOK.md)** to provision the GCP resources and execute the Dataform run.
* Review the **[Prompts & Architecture Guide](docs/PROMPTS_AND_ARCHITECTURE.md)** to understand how Vertex Context Caching is injected into the BigQuery SQL.