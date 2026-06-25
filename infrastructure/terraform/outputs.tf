output "artifact_registry_repository_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.name}"
  description = "The URL of the Artifact Registry repository."
}

output "landing_bucket_name" {
  value       = google_storage_bucket.landing.name
  description = "The name of the GCS landing bucket."
}

output "archive_bucket_name" {
  value       = google_storage_bucket.archive.name
  description = "The name of the GCS archive bucket."
}

output "extractor_service_url" {
  value       = google_cloud_run_v2_service.extractor.uri
  description = "The URI of the Extractor Cloud Run service."
}

output "extractor_service_account_email" {
  value       = google_service_account.extractor.email
  description = "The email of the Extractor service account."
}

output "ontology_ingest_service_account_email" {
  value       = google_service_account.ingest.email
  description = "The email of the Ontology Ingest service account."
}

output "workflow_service_account_email" {
  value       = google_service_account.workflow.email
  description = "The email of the Workflow service account."
}

output "workflow_name" {
  value       = google_workflows_workflow.ingestion.name
  description = "The name of the orchestration workflow."
}
