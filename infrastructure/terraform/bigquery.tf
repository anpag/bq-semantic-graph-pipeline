# BigQuery Staging Dataset
resource "google_bigquery_dataset" "staging" {
  dataset_id                  = "kg_staging"
  friendly_name               = "Knowledge Graph Staging"
  description                 = "Staging dataset for raw extractions landing and intermediate parsing views."
  location                    = var.region
  delete_contents_on_destroy = var.environment == "dev" ? true : false

  labels = {
    env = var.environment
  }

  depends_on = [google_project_service.services]
}

# BigQuery Production Dataset
resource "google_bigquery_dataset" "production" {
  dataset_id                  = "kg_production"
  friendly_name               = "Knowledge Graph Production"
  description                 = "Production dataset for canonical nodes, edges, materialized ontology, and property graphs."
  location                    = var.region
  delete_contents_on_destroy = var.environment == "dev" ? true : false

  labels = {
    env = var.environment
  }

  depends_on = [google_project_service.services]
}
