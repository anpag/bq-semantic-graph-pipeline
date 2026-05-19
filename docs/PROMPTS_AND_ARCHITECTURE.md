# AI Prompt Architecture: Ontology-Driven Graph Extraction

This document outlines the core LLM prompts utilized in the BigQuery Dataform pipeline to dynamically generate a Property Graph from unstructured documents.

---

## Content Caching & Ontology Injection
To handle the large size of the scientific ontology and strict syntax guides, this architecture uses Vertex AI Context Caching to avoid context dilution and timeout limits:

**Vertex AI Context Caching via SQL (Dataform Extraction - `page_level_extractions.sqlx`):**
BigQuery ML's native `AI.GENERATE` supports binding to external Vertex AI Cache IDs via the `cachedContent` parameter in `model_params`. We leverage this natively inside the Dataform pipeline, securely passing the cached `kg.owl` mappings to Gemini. The Cache ID, Location, and Project ID are dynamically injected via Dataform variables (`${dataform.projectConfig.vars.ontology_cache_id}`).

---

## Part 1: Dataform Extraction Layer (BigQuery `AI.GENERATE`)

### 1. The AI Router (Document Classification & Canonicalization)
*   **File Path:** `knowledge_hub/dataform/definitions/01_document_canonicalization/route_landing_files.sqlx`
*   **Execution Context:** Runs in a SQL loop, processing batches of documents to establish global context.
*   **Model:** `gemini-2.5-pro`
*   **Parameters:**
    *   `temperature: 0.2`
    *   `maxOutputTokens: 8192`
*   **Output Schema (Enforced):** Includes `global_context_summary`, `primary_ontology_class`, and the `entity_dictionary`.

### 2. Generic Triples Extraction (Page-Level)
*   **File Path:** `knowledge_hub/dataform/definitions/02_triples_extraction/page_level_extractions.sqlx`
*   **Execution Context:** Processes documents on a per-page basis using a parallel `CROSS JOIN`.
*   **Ontology Context:** Injected dynamically using Vertex Context Caching.
*   **Model:** `gemini-2.5-pro`
*   **Parameters:**
    *   `temperature: 0.0`
    *   `maxOutputTokens: 8192`
*   **Prompt Text:**
    ```text
    You are an expert Data Extraction Agent at ACME.
    Analyze ONLY the contents of PAGE %d of the provided document. Ignore all other pages.
              
    CRITICAL INSTRUCTION: If the document has fewer than %d pages, or if PAGE %d is completely blank, or if there is absolutely no useful information on this specific page, YOU MUST OUTPUT an empty JSON object: {}
    Do not hallucinate or guess what might be on this page. If it doesn't exist, return {}.
              
    Otherwise, extract ALL relevant Knowledge from this page as a Generic Property Graph (Triples).
    Align the extraction STRICTLY to the kg.owl ontology structures.
              
    Output ONLY a valid JSON object following this exact schema:
    {
      "extracted_nodes": [
        {
          "node_name": "String",
          "ontology_class": "String (MUST exactly match a Class in kg.owl)",
          "properties": "String (JSON string of any specific attributes like status, values, observations)"
        }
      ],
      "extracted_edges": [
        {
          "source_node_name": "String (MUST match a node_name above)",
          "target_node_name": "String (MUST match a node_name above)",
          "ontological_relationship": "String (MUST exactly match a Relationship in kg.owl)",
          "evidence_insight": "String (The tacit knowledge or textual evidence connecting them from the page)"
        }
      ]
    }
    ```

### Virtual Labeled Property Graph (LPG) Integration
The core extractions exist as raw Triples (`global_nodes`, `global_edges`). To afford Generative AI Agents predictable targets, the architecture layers BigQuery Views (`Node_Molecule`, `Node_Experiment`) dynamically atop the `global_nodes` table. The final Property Graph maps directly to these views.

**Handling Aliases (SKOS closeMatch):**
Aliases and lot numbers encountered during extraction are natively resolved via semantic web standards (SKOS). They are physically materialized into the graph as `Alias` nodes and connected to their standard entity via a `closeMatch` edge. Agents can natively query paths like:
`MATCH (a:Alias {name: 'Lot-1234'})-[:closeMatch]->(m:Molecule)`