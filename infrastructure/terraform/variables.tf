variable "project_id" {
  type        = string
  description = "The GCP Project ID where resources will be provisioned."
  default     = "semantic-graph-demo"
}

variable "region" {
  type        = string
  description = "The GCP region for regional resources (e.g., Cloud Run, Workflows, GCS)."
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "The deployment environment (e.g., dev, staging, prod)."
  default     = "dev"
}

variable "dataform_repository_name" {
  type        = string
  description = "The name of the Dataform repository in GCP."
  default     = "bq-semantic-graph-pipeline"
}
