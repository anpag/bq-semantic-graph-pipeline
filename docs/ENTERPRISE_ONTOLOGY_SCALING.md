# Enterprise Ontology Scaling Architecture

## The Core Problem: LLM vs. Semantic Topologies
As highlighted by enterprise graph experts, using Large Language Models (LLMs) to perform post-extraction "sanity checks" or SHACL (Shapes Constraint Language) validations on a Knowledge Graph is a lethal anti-pattern. 
1. **It does not scale:** Running an LLM over millions of extracted edges to verify semantic compliance will exhaust API quotas and budgets.
2. **It is non-deterministic:** LLMs cannot reliably enforce strict directed acyclic graph (DAG) hierarchies or domain/range constraints.
3. **OWL is too heavy:** A standard `.owl` file (like OBI or SNOMED) can exceed 100,000+ lines of RDF/XML. You cannot inject this directly into an LLM prompt.

## The Google Cloud Solution: Relational SHACL Enforcement
To achieve true enterprise scalability, we must decouple **Extraction (AI)** from **Validation (SQL)**. The architecture below details how to natively ingest a massive `.owl` file into BigQuery and use the relational engine to enforce SHACL constraints in milliseconds.

---

### Phase 1: Automated Ontology Ingestion (CI/CD)
You cannot manage an enterprise ontology by manually uploading CSVs. The ontology must be managed as code.

1. **The Source:** The Data Governance team maintains the master `kg.owl` file in a dedicated Git repository.
2. **Eventarc + Cloud Run Pipeline:** When a new version of `kg.owl` is merged to `main`, an Eventarc trigger fires a Cloud Run service.
3. **RDFLib Parsing:** The Cloud Run service uses Python's `rdflib` to parse the massive XML/RDF graph into flat relational formats. It extracts:
   *   `onto_classes` (URI, Label, Definition)
   *   `onto_properties` (URI, Label, Domain, Range)
   *   `onto_edges` (Source_URI, Target_URI, Relationship_Type - e.g., `rdfs:subClassOf`)
4. **BigQuery Load:** The parsed tables are pushed directly into a dedicated BigQuery dataset: `kg_ontology_master`.

### Phase 2: The Ontology Property Graph (Meta-Graph)
Once the raw ontology data is in BigQuery, Dataform constructs a **Meta-Graph**—a Property Graph of the rules themselves.

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
The LLM still needs to know what vocabulary to use during the initial extraction. 
The Cloud Run service from Phase 1 automatically generates a "Distilled Markdown" version of the `kg.owl` file (containing only the top-level generic classes and predicates). This lightweight markdown is pushed to **Vertex AI Context Caching**. 

### Phase 4: Relational SHACL Validation (The DLQ)
When the extraction pipeline runs, it uses the cached markdown to extract Generic Triples (`global_nodes`, `global_edges`). 

**This is where the concern is solved.** Before inserting the LLM's output into the final production graph, Dataform executes a strict Relational SHACL Validation using ISO GQL.

**Rule 1: Class Existence (Vocabulary Check)**
Dataform performs an `INNER JOIN` between the LLM's `extracted_nodes.ontology_class` and the `kg_ontology_master.onto_classes` table. If the LLM hallucinated a class that doesn't exist in the 100,000+ row dictionary, the node is dropped into the Semantic Dead-Letter Queue (DLQ).

**Rule 2: Edge Topology (Domain & Range Enforcement)**
If the LLM extracts an edge (e.g., `MoleculeA` -> `treats` -> `DiseaseB`), BigQuery must validate that the edge is legally allowed by the ontology.
Using BigQuery ISO GQL or Recursive CTEs, we query the Meta-Graph to verify:
1. Is the source node's class a valid `rdfs:domain` (or a subclass of the domain) for the `treats` property?
2. Is the target node's class a valid `rdfs:range` (or a subclass of the range) for the `treats` property?

```sql
-- Conceptual SHACL Validation using ISO GQL
INSERT INTO dlq_invalid_topology
SELECT edge.edge_id
FROM extracted_edges edge
WHERE NOT EXISTS (
  SELECT 1 FROM GRAPH_TABLE(kg_ontology.master_graph
    -- Traverse up the subclass hierarchy to see if it meets the Domain/Range constraints
    MATCH (source_class)-[:SUBCLASS_OF*0..5]->(valid_domain),
          (target_class)-[:SUBCLASS_OF*0..5]->(valid_range)
    WHERE source_class.label = edge.source_ontology_class
      AND target_class.label = edge.target_ontology_class
      AND valid_domain.property_domain = edge.ontological_relationship
  )
)
```

### Phase 5: Handling Millions of Documents (The Batch Architecture)
The current Dataform `AI.GENERATE` approach is synchronous. If we attempt to pass 10 million legacy PDFs through synchronous BigQuery ML queries, the pipeline will inevitably crash due to hard 6-hour BigQuery execution timeouts and Vertex AI Requests-Per-Minute (RPM) throttling. 

To scale to millions of documents, the architecture must implement a **Dual-Mode Extraction Pattern**:

1.  **Historical Backlog (Vertex AI Batch Prediction):**
    *   We use BigQuery to export the millions of GCS URIs from the `document_master_record` into JSONL format in Cloud Storage.
    *   We submit a **Vertex AI Batch Prediction Job**. This is an asynchronous, fully managed Google Cloud service designed to process millions of multimodal LLM requests over hours or days, automatically handling exponential backoffs, throughput throttling, and retries without consuming synchronous database compute.
    *   The batch job writes the extracted JSON arrays back to BigQuery staging tables. Dataform then picks up the data and runs the Relational SHACL validation (Phase 4).
2.  **Day-Forward Delta Load (Dataform AI.GENERATE):**
    *   Once the historical backlog is processed, the system switches back to our current Dataform `AI.GENERATE` script. As scientists upload a few hundred new documents a day, the synchronous Dataform pipeline processes them in minutes.

### Phase 6: Spanner Sync for OLTP (Real-Time Serving)
As Charlie noted, BigQuery is for OLAP. Once BigQuery has extracted, embedded, and strictly validated 30 years of historical data against the ontology, the final "Clean Graph" is reverse-ETL'd into **Google Cloud Spanner**. 

Spanner provides the single-digit millisecond latency required for the KG-Agent UI to traverse the graph in real-time.