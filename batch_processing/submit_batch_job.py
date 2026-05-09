import os
from google.cloud import aiplatform

PROJECT_ID = os.environ.get("PROJECT_ID", "your-project-id")
LOCATION = os.environ.get("LOCATION", "us-central1")
BUCKET_NAME = os.environ.get("BUCKET_NAME", "your-bucket-name")

def submit_batch_extraction_job(jsonl_input_uri: str, output_uri_prefix: str):
    """
    Submits a managed Vertex AI Batch Prediction job for millions of documents.
    This prevents BigQuery AI.GENERATE concurrency limits and 6-hour timeouts.
    """
    print(f"Initializing Vertex AI in {PROJECT_ID}/{LOCATION}")
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # Initialize the Gemini 2.5 Pro Model
    model = aiplatform.GenerativeModel("gemini-2.5-pro")

    print(f"Submitting Batch Prediction Job for: {jsonl_input_uri}")
    
    # We submit the job asynchronously. Vertex AI manages the exponential backoff, 
    # API rate limit throttling, and retries automatically over hours/days.
    batch_job = model.batch_predict(
        source_uri=jsonl_input_uri,
        destination_uri_prefix=output_uri_prefix,
        # In a real environment, you would inject the Ontology Cache ID into the system instruction here
        system_instruction=[
            "You are an expert Data Extraction Agent. Extract Generic Triples bounded by the provided ontology."
        ]
    )
    
    print(f"Batch Job created successfully. Job ID: {batch_job.name}")
    print("Monitor progress in the Google Cloud Console.")

if __name__ == "__main__":
    # Example Usage: 
    # The JSONL file contains millions of lines, each with a GCS URI of a PDF to process.
    input_uris = f"gs://{BUCKET_NAME}/03_processing/backlog_documents_*.jsonl"
    output_prefix = f"gs://{BUCKET_NAME}/03_processing/batch_results/"
    
    # submit_batch_extraction_job(input_uris, output_prefix)
    print("Script executed. Batch job submission is commented out to prevent costs.")