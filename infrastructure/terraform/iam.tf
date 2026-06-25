# --- 1. Extractor Service Account ---
resource "google_service_account" "extractor" {
  account_id   = "extractor-sa"
  display_name = "Extractor Service Account"
  description  = "Service account for the Cloud Run Extractor service."
}

# Project-level role: Vertex AI User
resource "google_project_iam_member" "extractor_vertex" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.extractor.email}"
}

# Project-level role: BigQuery Job User (required to run queries)
resource "google_project_iam_member" "extractor_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.extractor.email}"
}

# Bucket-level role: Read access to Landing Bucket
resource "google_storage_bucket_iam_member" "extractor_landing_read" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.extractor.email}"
}

# Dataset-level role: Read/Write to Staging Dataset
resource "google_bigquery_dataset_iam_member" "extractor_staging_editor" {
  dataset_id = google_bigquery_dataset.staging.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.extractor.email}"
}

# Dataset-level role: Read to Production Dataset (to fetch ontology context)
resource "google_bigquery_dataset_iam_member" "extractor_production_viewer" {
  dataset_id = google_bigquery_dataset.production.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.extractor.email}"
}


# --- 2. Ontology Ingest Service Account ---
resource "google_service_account" "ingest" {
  account_id   = "ontology-ingest-sa"
  display_name = "Ontology Ingest Service Account"
  description  = "Service account for the Ontology Ingestion job."
}

# Project-level role: BigQuery Job User
resource "google_project_iam_member" "ingest_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.ingest.email}"
}

# Dataset-level role: Read/Write to Staging Dataset
resource "google_bigquery_dataset_iam_member" "ingest_staging_editor" {
  dataset_id = google_bigquery_dataset.staging.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.ingest.email}"
}


# --- 3. Orchestration Workflow Service Account ---
resource "google_service_account" "workflow" {
  account_id   = "pipeline-workflow-sa"
  display_name = "Pipeline Workflow Service Account"
  description  = "Service account for Cloud Workflows orchestration."
}

# Project-level role: BigQuery Job User (to run queries if needed)
resource "google_project_iam_member" "workflow_bq_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.workflow.email}"
}

# Project-level role: Dataform Editor (to trigger Dataform runs)
resource "google_project_iam_member" "workflow_dataform" {
  project = var.project_id
  role    = "roles/dataform.editor"
  member  = "serviceAccount:${google_service_account.workflow.email}"
}


# --- 4. Eventarc Service Account ---
resource "google_service_account" "eventarc" {
  account_id   = "pipeline-eventarc-sa"
  display_name = "Pipeline Eventarc Service Account"
  description  = "Service account for Eventarc GCS triggers."
}

# Project-level role: Allow Eventarc to receive events
resource "google_project_iam_member" "eventarc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

# Resource-level role: Allow Eventarc to invoke our specific Workflow
resource "google_workflows_workflow_iam_member" "eventarc_invokes_workflow" {
  project       = var.project_id
  region        = google_workflows_workflow.ingestion.region
  name          = google_workflows_workflow.ingestion.name
  role          = "roles/workflows.invoker"
  member        = "serviceAccount:${google_service_account.eventarc.email}"
}

# Fetch the GCS Service Agent for the project
data "google_storage_project_service_account" "gcs_account" {}

# Project-level role: Grant GCS Service Agent Pub/Sub publisher permissions.
# CRITICAL: Without this, GCS cannot publish event notifications to Eventarc/PubSub, causing triggers to fail.
resource "google_project_iam_member" "gcs_pubsub_publishing" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}
