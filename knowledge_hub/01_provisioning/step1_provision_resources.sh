#!/bin/bash
# Provisioning Script for ACME KG Knowledge Hub Pipeline
# Automates the creation of GCS buckets, folder structures, and BigQuery datasets.
# NOTE: Table creation and Graph Ontology are now managed via Dataform!

PROJECT_ID="your-project-id"
REGION="US"

# 1. Create the Storage Bucket for Raw Ingestion (Images/PDFs)
BUCKET_NAME="your-bucket-name"

echo "Provisioning GCS Bucket: gs://$BUCKET_NAME"
if ! gcloud storage ls "gs://$BUCKET_NAME" &> /dev/null; then
    gcloud storage buckets create "gs://$BUCKET_NAME" --project="$PROJECT_ID" --location="$REGION"
    gcloud storage buckets update "gs://$BUCKET_NAME" --uniform-bucket-level-access
    echo "Bucket gs://$BUCKET_NAME created successfully."
else
    echo "Bucket gs://$BUCKET_NAME already exists. Skipping creation."
fi

# Create logical folder structure by uploading empty objects
echo "Creating logical folder structure in GCS..."
for folder in "01_landing/" "02_legacy_converted/" "03_processing/text/" "03_processing/visuals/" "04_archive/"; do
    if ! gcloud storage ls "gs://$BUCKET_NAME/$folder" &> /dev/null; then
        touch /tmp/empty_file
        gcloud storage cp /tmp/empty_file "gs://$BUCKET_NAME/$folder"
        rm /tmp/empty_file
        echo "Created folder: $folder"
    fi
done

# 2. Create the BigQuery Datasets
HUB_DATASET_NAME="kg_knowledge_hub"
GRAPH_DATASET_NAME="kg_graph_data"

echo "Provisioning BigQuery Dataset: $PROJECT_ID:$HUB_DATASET_NAME"
if ! bq ls --project_id="$PROJECT_ID" | grep -q "$HUB_DATASET_NAME"; then
    bq mk --project_id="$PROJECT_ID" --location="$REGION" --dataset "$HUB_DATASET_NAME"
    echo "Dataset $PROJECT_ID:$HUB_DATASET_NAME created successfully."
else
    echo "Dataset $PROJECT_ID:$HUB_DATASET_NAME already exists."
fi

echo "Provisioning BigQuery Dataset for Graph Data: $PROJECT_ID:$GRAPH_DATASET_NAME"
if ! bq ls --project_id="$PROJECT_ID" | grep -q "$GRAPH_DATASET_NAME"; then
    bq mk --project_id="$PROJECT_ID" --location="$REGION" --dataset "$GRAPH_DATASET_NAME"
    echo "Dataset $PROJECT_ID:$GRAPH_DATASET_NAME created successfully."
else
    echo "Dataset $PROJECT_ID:$GRAPH_DATASET_NAME already exists."
fi

echo "Provisioning step complete! Please use Dataform to deploy the table schemas and graph definitions."
