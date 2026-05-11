# ACME KG Knowledge Hub - Deployment & Recreation Runbook

This guide explains every component of the Knowledge Hub pipeline and provides step-by-step instructions on how to recreate this entire architecture from scratch in a new Google Cloud Project.

---

## Part 1: Component Architecture Explained

The Knowledge Hub is built on an **AI-First Ingestion Architecture**. It avoids rigid Python parsing scripts in favor of native BigQuery ML capabilities, allowing the system to automatically adapt to new files based on a semantic ontology.

### 1. The GCS Landing Zone & Object Table
*   **Component:** Google Cloud Storage (`gs://<bucket>/01_landing/`) + BigQuery Object Table (`raw_landing_objects`).
*   **Why:** Instead of writing data loaders, we drop raw files (PDFs, PPTs, CSVs) into GCS. The BigQuery Object Table exposes these files as queryable rows in SQL, providing the `uri` and `content_type`.

### 2. The Cloud Resource Connection
*   **Component:** BigQuery Connection (`kg_knowledge_hub_conn`).
*   **Why:** BigQuery cannot natively talk to Vertex AI or read GCS Object Tables without an identity. This connection provisions a Service Account that is granted IAM roles (`aiplatform.user`, `storage.objectViewer`) to act as the bridge.

### 3. The AI Router
*   **Component:** `route_landing_files.sqlx` (Dataform) + Gemini 2.5 Pro.
*   **Why:** We use `AI.GENERATE` combined with `OBJ.MAKE_REF(uri)` to pass the raw binary file directly to Gemini. The router evaluates the file, determines its document type against the ontology, and registers it in the `document_master_record`.

### 4. The "Chunk-Extract-Synthesize" Pipeline (Tacit Extraction)
*   **Component:** `page_level_extractions.sqlx` (Dataform).
*   **Why:** Large scientific PDFs (50+ pages) suffer from the "Lost in the Middle" syndrome where LLMs forget or hallucinate data buried in tables. 
    *   **Chunk (Map):** We `CROSS JOIN` the document with `GENERATE_ARRAY(1, N)` to create a row for every page.
    *   **Extract:** Gemini evaluates *only* that specific page in isolation, mapping unstructured text strictly against the cached `kg.owl` ontology. It outputs Generic Graph Triples (`extracted_nodes` and `extracted_edges`).
    *   **Synthesize (Reduce):** A downstream Dataform script (`insert_global_graph.sqlx`) merges these JSON extractions into the final `global_nodes` and `global_edges` property graph tables.

---

## Part 2: Step-by-Step Recreation Guide

Follow these steps to deploy the entire solution in a new GCP Project.

### Step 0: Precompute Ontology Topology Rules
Before deploying the BigQuery infrastructure, you must use the offline Python Reasoner to materialize the hidden Description Logic rules from the raw OWL file into flat CSV dictionaries.
1. Navigate to the ingestion directory:
```bash
cd public_release/ontology_ingestion
```
2. Install the semantic reasoning dependencies:
```bash
pip install -r requirements.txt
```
3. Execute the Deductive Reasoner to generate the rulebooks:
```bash
python3 generate_master_rulebook.py
```
*(Note: This generates `onto_rules_massive.csv` locally. Do not commit this massive generated file to version control.)*

### Step 1: Enable APIs
```bash
gcloud services enable bigquery.googleapis.com \
    aiplatform.googleapis.com \
    storage.googleapis.com
```

### Step 2: Provision Storage and Datasets
1. Create the bucket and folders:
```bash
gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=US
gcloud storage buckets update gs://YOUR_BUCKET_NAME --uniform-bucket-level-access
```
2. Create the BigQuery Datasets:
```bash
bq mk --location=US --dataset YOUR_PROJECT_ID:kg_knowledge_hub
bq mk --location=US --dataset YOUR_PROJECT_ID:kg_graph_data
```

### Step 3: Create the BigQuery Connection & Grant IAM Roles
1. Create the connection:
```bash
bq mk --connection --location=US --project_id=YOUR_PROJECT_ID \
    --connection_type=CLOUD_RESOURCE kg_knowledge_hub_conn
```
2. Retrieve the generated Service Account:
```bash
bq show --connection --project_id=YOUR_PROJECT_ID --location=US kg_knowledge_hub_conn
# Look for "serviceAccountId": "bqcx-.....@gcp-sa-bigquery-condel.iam.gserviceaccount.com"
```
3. Grant the required roles to that Service Account:
```bash
SA_EMAIL="bqcx-.....@gcp-sa-bigquery-condel.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/storage.objectViewer"
```

### Step 4: Deploy the Dataform Pipeline
1. Navigate to the Dataform directory:
```bash
cd public_release/knowledge_hub/dataform
```
2. Run Dataform to deploy the setup files (Master Record, Graph Ontology, Models):
```bash
dataform run dataform --actions "kg_knowledge_hub.document_master_record" \
                      --actions "kg_knowledge_hub.raw_landing_objects" \
                      --actions "kg_knowledge_hub.gemini_model" \
                      --actions "kg_knowledge_hub.kg_graph"
```

### Step 5: Test the AI Router
1. Upload a PDF to `gs://YOUR_BUCKET_NAME/01_landing/`.
2. Run the AI Router Dataform action:
```bash
dataform run dataform --actions "kg_knowledge_hub.route_landing_files"
```
3. Verify the file was classified successfully in BigQuery:
```sql
SELECT original_filename, processing_status, pipeline_lineage_tags 
FROM `YOUR_PROJECT_ID.kg_knowledge_hub.document_master_record`
```

### Step 6: Run Generic Triples Extraction & Graph Synthesis
1. Run the Chunk-Extract-Synthesize pipeline to extract knowledge page-by-page:
```bash
dataform run dataform --actions "kg_knowledge_hub.page_level_extractions"
```
2. Merge the extracted data into the Unified Graph Node and Edge tables:
```bash
dataform run dataform --actions "kg_graph_data.insert_global_graph"
```

You now have a fully functional, dynamic ontology-driven Property Graph!