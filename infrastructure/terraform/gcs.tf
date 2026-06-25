# GCS Bucket for Landing raw documents (PDFs, Excel)
resource "google_storage_bucket" "landing" {
  name                        = "semantic-graph-landing-${var.project_id}-${var.environment}"
  location                    = var.region
  force_destroy               = var.environment == "dev" ? true : false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  # Ensure APIs are enabled first
  depends_on = [google_project_service.services]
}

# GCS Bucket for Archiving processed documents
resource "google_storage_bucket" "archive" {
  name                        = "semantic-graph-archive-${var.project_id}-${var.environment}"
  location                    = var.region
  force_destroy               = var.environment == "dev" ? true : false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.services]
}
