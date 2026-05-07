# AI Prompt Architecture: Ontology-Driven Graph Extraction

This document outlines the core LLM prompts utilized in the BigQuery Dataform pipeline to dynamically generate a Property Graph from unstructured documents.

---

## Content Caching & Ontology Injection
To handle the large size of the scientific ontology and strict syntax guides, this architecture uses Vertex AI Context Caching to avoid context dilution and timeout limits:

**Vertex AI Context Caching via SQL (Dataform Extraction - `page_level_extractions.sqlx`):**
BigQuery ML's native `AI.GENERATE` supports binding to external Vertex AI Cache IDs via the `cachedContent` parameter in `model_params`. We leverage this natively inside the Dataform pipeline, securely passing the cached `kg.owl` mappings to Gemini. The Cache ID, Location, and Project ID are dynamically injected via Dataform variables (`${dataform.projectConfig.vars.ontology_cache_id}`).

---

## Part 1: Dataform Extraction Layer (BigQuery `AI.GENERATE`)

### 1. The AI Router (Document Classification)
*   **File Path:** `knowledge_hub/dataform/definitions/02_ai_router/route_landing_files.sqlx`
*   **Execution Context:** Runs in a SQL loop, processing batches of 50 new files at a time to prevent transaction timeouts. The actual document content is passed to Gemini securely using BigQuery's `OBJ.MAKE_REF(uri)` function.
*   **Model:** `gemini-2.5-pro`
*   **Parameters:**
    *   `temperature: 0.2` (Low temperature for deterministic classification)
    *   `maxOutputTokens: 8192`
*   **Output Schema (Enforced):** `ontology_class STRING, experiment_id STRING, target_molecules ARRAY<STRING>, summary STRING`
*   **Prompt Text:**
    ```text
    You are an AI Data Steward for a KG Knowledge Hub. Analyze this file's contents against the kg.owl ontology. 
    Determine its ontological class. Is it an Inventory_Log, an Experiment_Data_Set, 
    or an Experiment_Report? 
    Extract the relevant Experiment IDs, Target Molecules, and a brief summary of what this data is for.
    Output ONLY a valid JSON object matching this schema...
    ```

### 2. Generic Triples Extraction (Page-Level)
*   **File Path:** `knowledge_hub/dataform/definitions/03_tacit_extraction/page_level_extractions.sqlx`
*   **Execution Context:** Processes exactly 1 document per transaction to avoid BigQuery timeouts. It uses a `CROSS JOIN UNNEST` to iterate through the estimated number of pages in the document.
*   **Variables Injected:** The current page number (`page_num`) is injected via SQL `%d` formatting three times into the prompt to ensure the LLM strictly bounds its extraction to that single page.
*   **Ontology Context:** Injected dynamically using the `cachedContent` argument via `FORMAT()` targeting the Vertex Cache ID configured in `workflow_settings.yaml`.
*   **Model:** `gemini-2.5-pro`
*   **Parameters:**
    *   `temperature: 0.0` (Absolute zero for strict entity extraction and schema adherence. No "thinking" is enabled).
    *   `maxOutputTokens: 8192`
*   **Output Schema (Enforced):** A generic arrays of `extracted_nodes` and `extracted_edges` for Triples extraction.
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