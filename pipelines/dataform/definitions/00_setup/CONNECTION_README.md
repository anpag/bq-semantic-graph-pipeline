# BigQuery Connection Setup
To allow BigQuery Dataform to natively call Vertex AI models (like Gemini) and read raw files directly from the GCS landing bucket (via Object Tables), we provisioned a dedicated `CLOUD_RESOURCE` connection.

*   **Connection Name:** `kg_knowledge_hub_conn`
*   **Service Account:** `bqcx-123456789-abcd@gcp-sa-bigquery-condel.iam.gserviceaccount.com` (example)
*   **IAM Roles Granted:**
    *   `roles/aiplatform.user` (Allows calling AI.GENERATE with Gemini)
    *   `roles/storage.objectViewer` (Allows reading files from `gs://your-bucket-name/*`)

*Note: This connection cannot be created via Dataform SQL and must be managed via Terraform or the `bq` CLI.*
