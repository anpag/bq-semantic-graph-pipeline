# BigQuery Semantic Graph Pipeline

A reference architecture for automated ingestion and semantic extraction of unstructured scientific documents into a native BigQuery Property Graph, utilizing BigQuery ML (`AI.GENERATE`) and relational SHACL (Shapes Constraint Language) enforcement.

## System Architecture Overview

This repository demonstrates a highly scalable, serverless extraction pipeline natively hosted within Google Cloud. By utilizing Dataform, BigQuery Object Tables, and Gemini 2.5 Pro, the system bypasses external orchestration middleware and fragile heuristic parsing scripts.

The architecture decouples the physical database schema from the semantic ontology. It extracts generic graph primitives (Subject-Predicate-Object triples) where the semantic vocabulary is dynamically bounded by open-source ontologies (e.g., OBI, BFO). Topological integrity is enforced relationally rather than at the model-generation layer.

### Core Technologies
1. **Google Cloud Storage (GCS) & BigQuery Object Tables:** Provides unified SQL access to raw, unstructured binary objects.
2. **Dataform:** Orchestrates idempotency, data transformations, and the execution of the final `CREATE PROPERTY GRAPH` DDL.
3. **BigQuery ML (`AI.GENERATE`):** Executes multimodal inference directly over GCS URIs to perform document classification and targeted entity extraction.
4. **BigQuery ML (`ML.GENERATE_EMBEDDING`):** Calculates vector representations for extracted nodes, facilitating retrieval-augmented generation (RAG) during pipeline execution and downstream semantic search operations.
5. **Python (`rdflib` / `owlrl`):** An offline CI/CD utility that parses OWL definitions, computes deductive closures over BFO restrictions, and materializes topological constraints into relational BigQuery tables.

## Pipeline Execution Flow

### 1. Ingestion & Object Registration (`00_setup/`)
Unstructured files (PDF, CSV, TXT) deposited into the GCS landing zone are automatically registered via the `raw_landing_objects.sqlx` Object Table. BigQuery authenticates access to these payloads via a dedicated Cloud Resource Connection, eliminating the need for signed URL generation.

### 2. Document-Level Canonicalization (`02_ai_router/`)
Upon detection of an unmapped file URI, the classification pipeline reads the complete document to establish global context. The pipeline executes a deterministic entity resolution step, mapping localized textual synonyms and laboratory aliases (e.g., lot numbers, shorthand) to strict canonical identifiers (e.g., mapping `lot:102665358` to `Fenofibrate`). This output is persisted to the `document_master_record`.

### 3. Dynamic Ontology Subsetting
To prevent context window saturation and mitigate instruction-following degradation in the LLM, the architecture dynamically subsets the target ontology prior to extraction. BigQuery `VECTOR_SEARCH` is utilized to match the document's global context vector against the materialized ontology table, generating a constrained, highly targeted subset of permissible classes and properties unique to the source document.

### 4. Bounded Triples Extraction (`03_tacit_extraction/`)
Extraction tasks operating on large-scale scientific documentation (e.g., 50+ pages) are chunked to mitigate the "lost in the middle" phenomenon common in large context window inference. 
Dataform executes a parallel `CROSS JOIN` operation, invoking `AI.GENERATE` on a per-page basis. The prompt context is rigidly bounded by the targeted ontology subset (Step 3) and the canonical entity dictionary (Step 2).

*Knowledge Preservation:* Observations or modeling conclusions that cannot be semantically represented as a valid structural edge are safely extracted into a semi-structured `unbound_insights` JSON array, preserving tacit knowledge without violating graph topology.

### 5. Relational SHACL Validation & Graph Synthesis
LLM output is treated as untrusted data until validated. Dataform executes a strict `INNER JOIN` between the LLM's extracted edges and the deduplicated, reasoning-expanded `onto_rules` table stored in BigQuery.
*   **Validation Failure:** Edges violating domain or range constraints are routed to the `dlq_semantic_failures` table for manual review.
*   **Validation Success:** Valid edges are deduplicated via MD5 hashing and inserted into `global_nodes` and `global_edges`. The final topology is queryable via BigQuery's native ISO GQL implementation (`kg_graph.sqlx`).

## Further Documentation
* **[Enterprise Ontology Scaling](docs/ENTERPRISE_ONTOLOGY_SCALING.md)**: Details the CI/CD pipeline and the use of deductive reasoners (`owlrl`) for expanding BFO restrictions into flat relational rules.
* **[SQL Prompts & Architecture](docs/PROMPTS_AND_ARCHITECTURE.md)**: Technical breakdown of the `AI.GENERATE` schemas and entity canonicalization directives.