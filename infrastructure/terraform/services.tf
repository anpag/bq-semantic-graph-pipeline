# --- 1. Artifact Registry Repository ---
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "app-repo"
  description   = "Docker repository for extractor and ingestion services."
  format        = "DOCKER"

  depends_on = [google_project_service.services]
}

# --- 2. Cloud Run Service (Extractor) ---
resource "google_cloud_run_v2_service" "extractor" {
  name     = "extractor-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY" # Restrict to internal/Workflows only

  template {
    service_account = google_service_account.extractor.email
    
    containers {
      # Bootstrap with a public placeholder image.
      # CI/CD (Cloud Build) will overwrite this with the real image.
      image = "gcr.io/cloudrun/hello"
      
      ports {
        container_port = 8080
      }
      
      resources {
        limits = {
          cpu    = "1"
          memory = "1024Mi"
        }
      }
    }
  }

  # Crucial for Bootstrap: prevent Terraform from reverting CI/CD updates
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_project_service.services,
    google_service_account.extractor
  ]
}

# --- 3. Cloud Workflows (Orchestrator) ---
resource "google_workflows_workflow" "ingestion" {
  name            = "ingestion-workflow"
  region          = var.region
  description     = "Orchestrates GCS landing events, Cloud Run extraction, and Dataform compilation."
  service_account = google_service_account.workflow.email

  # Inject environment variables for the workflow (no hardcoding)
  user_env_vars = {
    EXTRACTOR_URL       = google_cloud_run_v2_service.extractor.uri
    ARCHIVE_BUCKET      = google_storage_bucket.archive.name
    DATAFORM_REPOSITORY = var.dataform_repository_name
  }

  # Bootstrap baseline workflow. CI/CD will deploy the real YAML.
  source_contents = <<EOF
- init:
    assign:
      - status: "bootstrap"
- return_result:
    return: $${status}
EOF

  lifecycle {
    ignore_changes = [
      source_contents,
    ]
  }

  depends_on = [
    google_project_service.services,
    google_service_account.workflow
  ]
}

# --- 4. IAM: Allow Workflow to Invoke Extractor ---
resource "google_cloud_run_v2_service_iam_member" "workflow_invokes_extractor" {
  project  = var.project_id
  location = google_cloud_run_v2_service.extractor.location
  name     = google_cloud_run_v2_service.extractor.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.workflow.email}"
}

# --- 5. Eventarc Trigger for GCS Landing Events ---
resource "google_eventarc_trigger" "gcs_landing" {
  name     = "gcs-landing-trigger"
  location = var.region
  project  = var.project_id

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }

  matching_criteria {
    attribute = "bucket"
    value     = google_storage_bucket.landing.name
  }

  destination {
    workflow = google_workflows_workflow.ingestion.id
  }

  service_account = google_service_account.eventarc.email

  depends_on = [
    google_project_service.services,
    google_workflows_workflow.ingestion,
    google_service_account.eventarc,
    google_project_iam_member.gcs_pubsub_publishing # Ensure GCS can publish before creating trigger
  ]
}
