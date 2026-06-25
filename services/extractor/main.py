import json
import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BigQuery Semantic Graph Pipeline - Extractor Service",
    description="FastAPI service to extract semantic triples from documents using Gemini.",
    version="1.0.0"
)

# Import the extraction agent
try:
    import extraction_agent
except ImportError:
    # Fallback for local development/testing if not in the same path
    from . import extraction_agent

class ExtractRequest(BaseModel):
    gcs_uri: str = Field(..., description="The gs:// GCS URI of the document to process.")
    project_id: str = Field("semantic-graph-demo", description="GCP Project ID.")
    staging_dataset: str = Field("kg_staging", description="Target BigQuery staging dataset.")

class ExtractResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    message: str = Field(..., description="Detailed status or error message.")
    extraction_result: Optional[Dict[str, Any]] = Field(None, description="The parsed JSON extraction result.")

@app.post("/extract", response_model=ExtractResponse, status_code=status.HTTP_200_OK)
def extract(request: ExtractRequest):
    """
    Extracts semantic triples from a document stored in GCS.
    
    This handler runs in a thread pool managed by FastAPI/anyio, making it
    suitable for synchronous, I/O-bound operations like calling the Vertex AI SDK.
    """
    logger.info(f"Received extraction request for URI: {request.gcs_uri}")
    
    if not request.gcs_uri.startswith("gs://"):
        logger.error(f"Invalid GCS URI: {request.gcs_uri}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="gcs_uri must start with 'gs://'"
        )
        
    try:
        # Call the synchronous extraction logic.
        # FastAPI's standard 'def' handler runs in a thread pool, preventing event loop blocking.
        raw_result = extraction_agent.extract_triples(
            gcs_uri=request.gcs_uri,
            project_id=request.project_id,
            staging_dataset=request.staging_dataset
        )
        
        # Parse the raw JSON string result from the agent into a dictionary.
        try:
            parsed_result = json.loads(raw_result)
        except json.JSONDecodeError as je:
            logger.error(f"Failed to parse extraction result as JSON: {je}. Raw result: {raw_result}")
            return ExtractResponse(
                status="error",
                message=f"Extraction succeeded, but agent returned invalid JSON: {str(je)}",
                extraction_result=None
            )
            
        return ExtractResponse(
            status="success",
            message="Extraction completed and materialized to staging successfully.",
            extraction_result=parsed_result
        )
        
    except Exception as e:
        logger.exception(f"Exception occurred during extraction for URI {request.gcs_uri}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )
