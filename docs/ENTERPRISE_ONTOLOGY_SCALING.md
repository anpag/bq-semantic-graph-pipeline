# Enterprise Ontology Scaling Architecture

## Core Problem: LLM vs. Semantic Topologies
As highlighted by enterprise graph engineers, utilizing Large Language Models (LLMs) to perform post-extraction SHACL (Shapes Constraint Language) validations on a Knowledge Graph is an architectural anti-pattern. 
1. **Scalability:** Executing LLM inference over millions of extracted edges to verify semantic compliance exhausts API quotas and operational budgets.
2. **Determinism:** LLMs cannot reliably enforce strict directed acyclic graph (DAG) hierarchies or transitive domain/range constraints.
3. **Payload Limitations:** Standard `.owl` files (e.g., OBI or SNOMED) frequently exceed 100,000 lines of RDF/XML. Injecting this raw payload into an LLM context window induces severe degradation in instruction following.

## Google Cloud Solution: Relational SHACL Enforcement
To achieve enterprise scalability, the architecture decouples **Extraction (AI)** from **Validation (SQL)**. The workflow below details how to natively ingest massive `.owl` files into BigQuery and leverage the relational engine to enforce SHACL constraints in milliseconds.

---

### Phase 1: Automated Ontology Ingestion (CI/CD)
Enterprise ontologies must be managed as code.

1. **Source Control:** Data Governance teams maintain the master `kg.owl` file in a dedicated Git repository.
2. **Eventarc Pipeline:** Merging updates to `kg.owl` triggers an Eventarc payload to a Cloud Run ingestion service.
3. **RDFLib Parsing:** The Cloud Run service utilizes Python's `rdflib` to parse the XML/RDF graph into flat relational formats, extracting:
   *   `onto_classes` (URI, Label, Definition)
   *   `onto_properties` (URI, Label, Domain, Range)
   *   `onto_edges` (Source_URI, Target_URI, Relationship_Type - e.g., `rdfs:subClassOf`)
4. **BigQuery Load:** Parsed tables are loaded into a dedicated dataset: `kg_ontology_master`.

### Phase 2: Ontology Property Graph (Meta-Graph)
Following ingestion, Dataform constructs a **Meta-Graph**—a BigQuery Property Graph defining the topological rules themselves.

```sql
CREATE OR REPLACE PROPERTY GRAPH kg_ontology.master_graph
  NODE TABLES (
    kg_ontology_master.onto_classes KEY(uri),
    kg_ontology_master.onto_properties KEY(uri)
  )
  EDGE TABLES (
    kg_ontology_master.onto_edges KEY(edge_id)
      SOURCE KEY(source_uri) REFERENCES onto_classes(uri)
      DESTINATION KEY(target_uri) REFERENCES onto_classes(uri)
      LABEL SUBCLASS_OF
  );
```

### Phase 3: Vertex AI Cache Distillation
To guide the LLM's initial extraction, the Cloud Run service from Phase 1 generates a "Distilled Markdown" abstraction of the `kg.owl` file (containing top-level generic classes and predicates). This lightweight markdown payload is pushed to **Vertex AI Context Caching**. 

### Phase 4: Relational SHACL Validation (Dead-Letter Queue)
During execution, Gemini utilizes the cached markdown to extract Generic Triples (`global_nodes`, `global_edges`). 

Prior to integrating the LLM output into the production graph, Dataform executes strict Relational SHACL Validation via ISO GQL.

**Rule 1: Class Existence (Vocabulary Verification)**
Dataform executes an `INNER JOIN` between the LLM's `extracted_nodes.ontology_class` and the `kg_ontology_master.onto_classes` table. Nodes containing hallucinated classes not present in the master dictionary are routed to the Semantic Dead-Letter Queue (DLQ).

**Rule 2: Edge Topology (Domain & Range Enforcement)**
If the LLM extracts an edge (e.g., `MoleculeA` -> `treats` -> `DiseaseB`), BigQuery validates topological compliance.
Using ISO GQL or Recursive CTEs, the pipeline queries the Meta-Graph to verify:
1. Is the source node's class a valid `rdfs:domain` (or a subclass of the domain) for the `treats` property?
2. Is the target node's class a valid `rdfs:range` (or a subclass of the range) for the `treats` property?

```sql
-- Conceptual SHACL Validation using ISO GQL
INSERT INTO dlq_invalid_topology
SELECT edge.edge_id
FROM extracted_edges edge
WHERE NOT EXISTS (
  SELECT 1 FROM GRAPH_TABLE(kg_ontology.master_graph
    -- Traverse up the subclass hierarchy to verify Domain/Range constraints
    MATCH (source_class)-[:SUBCLASS_OF*0..5]->(valid_domain),
          (target_class)-[:SUBCLASS_OF*0..5]->(valid_range)
    WHERE source_class.label = edge.source_ontology_class
      AND target_class.label = edge.target_ontology_class
      AND valid_domain.property_domain = edge.ontological_relationship
  )
)
```

### Phase 5: Handling High-Volume Backlogs (Batch Architecture)
The standard Dataform `AI.GENERATE` implementation executes synchronously. Passing millions of legacy documents through synchronous BigQuery ML queries will result in 6-hour execution timeouts and Vertex AI API throttling. 

To process high-volume historical backlogs, the architecture implements a **Dual-Mode Extraction Pattern**:

1.  **Historical Backlog (Vertex AI Batch Prediction):**
    *   BigQuery exports millions of GCS URIs from `document_master_record` to JSONL in Cloud Storage.
    *   A **Vertex AI Batch Prediction Job** is submitted. This asynchronous, managed service processes high-volume multimodal LLM requests, automatically managing exponential backoffs, throughput throttling, and retries independent of synchronous database compute.
    *   The batch job deposits extracted JSON arrays into BigQuery staging tables, triggering Dataform to execute Relational SHACL validation (Phase 4).
2.  **Day-Forward Delta Load (Dataform AI.GENERATE):**
    *   Following backlog processing, the system resumes synchronous Dataform `AI.GENERATE` execution. Day-forward ingestion (e.g., daily uploads) is processed synchronously within standard timeout thresholds.

### Phase 6: Spanner Sync for OLTP (Real-Time Serving)
BigQuery is optimized for OLAP. Once historical data has been extracted, embedded, and strictly validated against the ontology, the finalized graph is reverse-ETL'd into **Google Cloud Spanner**. 

Spanner provides the single-digit millisecond latency required for downstream user interfaces and interactive chat agents to traverse the graph in real-time.