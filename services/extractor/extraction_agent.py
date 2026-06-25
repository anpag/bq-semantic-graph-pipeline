import os
import json
import mimetypes
import tempfile
from google.cloud import bigquery
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# --- Configuration ---
LOCATION = os.environ.get("LOCATION", "us-central1")
# Enterprise standard: MUST use 3.5-flash or 3.1-pro
MODEL_NAME = "gemini-3.5-flash"

def initialize_vertex(project_id: str):
    """Initializes the Vertex AI SDK."""
    print(f"Initializing Vertex AI in {project_id}/{LOCATION} using {MODEL_NAME}...")
    vertexai.init(project=project_id, location=LOCATION)

def fetch_ontology_context(bq_client: bigquery.Client, project_id: str) -> tuple[str, bool]:
    """
    Fetches the allowed Nodes and Edges from the BigQuery Production Graph
    to build the Dynamic System Prompt. Returns (context, is_empty).
    """
    production_dataset = os.environ.get("PRODUCTION_DATASET", "kg_production")
    print(f"Fetching ontology context from {project_id}.{production_dataset}...")
    
    try:
        # 1. Fetch allowed Node Classes
        query_nodes = f"SELECT class_name, definition FROM `{project_id}.{production_dataset}.node_classes`"
        nodes_df = bq_client.query(query_nodes).to_dataframe()
        
        # 2. Fetch allowed Edge Rules
        query_edges = f"SELECT source_uri, relationship_type, target_uri FROM `{project_id}.{production_dataset}.edge_rules`"
        edges_df = bq_client.query(query_edges).to_dataframe()
    except Exception as e:
        print(f"Failed to fetch ontology tables from production dataset: {e}. Assuming empty ontology baseline.")
        return "", True
    
    if nodes_df.empty and edges_df.empty:
        return "", True
    
    # Build the context string
    context = "ALLOWED NODE CLASSES AND DEFINITIONS:\n"
    for _, row in nodes_df.iterrows():
        context += f"- Class: {row['class_name']} | Definition: {row['definition']}\n"
        
    context += "\nALLOWED RELATIONSHIPS (Source -> Relationship -> Target):\n"
    for _, row in edges_df.iterrows():
        context += f"- {row['source_uri']} -> {row['relationship_type']} -> {row['target_uri']}\n"
        
    return context, False

def build_system_prompt(ontology_context: str) -> str:
    """Builds the strict extraction prompt."""
    return f"""
    You are an expert Data Extraction Agent acting as the \"Dirty Extraction Stage\" for a Semantic Clean Room.
    Your task is to analyze the provided text and extract raw Entities and Relationships.
    
    CRITICAL RULES:
    1. Extract exactly what is written in the text. Do not attempt to guess or canonicalize standard Units of Measurement or canonical names.
    2. However, the TYPES of entities and relationships you extract must be strictly bounded by the allowed ontology below.
    3. If you find tacit knowledge or insights that don't fit the strict graph topology, place them in `unbound_knowledge`.
    4. EXHAUSTIVE EXTRACTION IS MANDATORY: You MUST extract relationships for ALL entities across ALL columns and ALL rows. Do not stop after processing the first column.
    5. CHEMICAL STRUCTURE RESOLUTION: For any entity identified or classified as a chemical compound, solvent, polymer, or monomer, you MUST attempt to resolve and include its canonical SMILES and InChI structural representations. These MUST be placed inside the `raw_properties` JSON object as keys `smiles` and `inchi`.
    
    ONTOLOGY CONTEXT:
    {ontology_context}
    
    OUTPUT SCHEMA:
    You MUST output valid JSON conforming exactly to this structure:
    {{
        \"extraction_plan\": \"Step-by-step plan to ensure exhaustive extraction of all nodes and edges across all columns/rows without skipping any\",
        \"extracted_nodes\": [
            {{"entity_name\": \"exact text from doc\", \"ontology_class\": \"must match an allowed class\", \"raw_properties\": {{\"raw_unit\": \"mls\", \"value\": \"10\", \"smiles\": \"C1CCOC1\", \"inchi\": \"InChI=1S/C4H8O/c1-2-4-5-3-1...\"}}}}
        ],
        \"extracted_edges\": [
            {{"source_entity\": \"must match a node\", \"target_entity\": \"must match a node\", \"relationship_type\": \"must match allowed relationship\", \"evidence\": \"textual evidence\"}}
        ],
        \"unbound_knowledge\": [
            {{"insight\": \"critical tacit knowledge\", \"category\": \"inferred category\"}}
        ]
    }}
    """

def build_open_extraction_prompt() -> str:
    """Builds the prompt for Automagic Ontology Generation when starting from a blank slate."""
    return f"""
    You are an expert Enterprise Knowledge Graph Architect acting as the \"Automagic Ontology Generator\" for a Semantic Clean Room.
    Your task is to analyze the provided text, infer a robust baseline Ontology, and extract the raw Entities and Relationships.
    
    CRITICAL INSPIRATION RULES:
    1. You MUST draw deep inspiration from the Allotrope Foundation Ontology (AFO) when categorizing materials, properties, and equipment.
    2. You MUST draw deep inspiration from the Chemical Methods Ontology (CHMO) when categorizing assays, test methodologies, and experimental procedures.
    3. EXHAUSTIVE EXTRACTION IS MANDATORY: You MUST extract relationships for ALL entities across ALL columns and ALL rows. Do not stop after processing the first column.
    4. CHEMICAL STRUCTURE RESOLUTION: For any entity identified or classified as a chemical compound, solvent, polymer, or monomer, you MUST attempt to resolve and include its canonical SMILES and InChI structural representations. These MUST be placed inside the `raw_properties` JSON object as keys `smiles` and `inchi`.
    
    OUTPUT SCHEMA:
    You MUST output valid JSON conforming exactly to this structure:
    {{
        \"extraction_plan\": \"Step-by-step plan to ensure exhaustive extraction of all nodes and edges across all columns/rows without skipping any. MUST explicitly plan how to connect EVERY single node into a unified graph. MUST ensure that EVERY inferred ontology node class participates in at least one edge_rule (no free/isolated ontology classes).\",
        \"inferred_ontology\": {{
            \"node_classes\": [
                {{"class_name\": \"e.g. Formulation\", \"definition\": \"A mixture of components...\", \"uri\": \"afo:Formulation\", \"synonyms\": \"mix, blend\", \"example\": \"FH-001\"}}
            ],
            \"edge_rules\": [
                {{"domain_class\": \"Formulation\", \"range_class\": \"LapShearTest\", \"relationship_type\": \"undergoes_test\"}}
            ]
        }},
        \"extracted_nodes\": [
            {{"entity_name\": \"exact text from doc\", \"ontology_class\": \"must match an inferred class\", \"raw_properties\": {{\"raw_unit\": \"mls\", \"value\": \"10\", \"smiles\": \"C1CCOC1\", \"inchi\": \"InChI=1S/C4H8O/c1-2-4-5-3-1...\"}}}}
        ],
        \"extracted_edges\": [
            {{"source_entity\": \"must match a node\", \"target_entity\": \"must match a node\", \"relationship_type\": \"must match an inferred relationship_type\", \"evidence\": \"textual evidence\"}}
        ]
    }}
    CRITICAL: 
    1. YOU MUST EXTRACT `extracted_edges` linking the `extracted_nodes` together based on your `edge_rules`. IF `extracted_edges` IS EMPTY, YOU HAVE FAILED. EVERY EXTRACTED NODE MUST BE CONNECTED.
    2. THE INFERRED ONTOLOGY MUST BE FULLY CONNECTED. EVERY single class in `node_classes` MUST be used in at least one `edge_rule`. IF THERE ARE ANY ISOLATED NODE CLASSES IN THE ONTOLOGY, YOU HAVE FAILED.
    3. DO NOT create abstract, top-level hierarchical categories (e.g. 'Equipment', 'Chemical Test', 'Physical Test') unless you explicitly extract nodes belonging to them AND connect them via edge rules. Every node_class must be grounded in actual extracted entities and relationships.
    """

def extract_triples(gcs_uri: str, project_id: str, staging_dataset: str) -> str:
    """
    Main extraction logic: downloads metadata/schema rules from BigQuery,
    handles input document formats (local parsing for XLSX, GCS direct Part for PDF/images),
    executes Vertex AI Gemini generation, lands results in BigQuery staging, and returns raw JSON.
    """
    bq_client = bigquery.Client(project=project_id)
    initialize_vertex(project_id)
    
    # 1. Dynamically build context from BigQuery
    ontology_context, is_empty = fetch_ontology_context(bq_client, project_id)
    
    if is_empty:
        print("Ontology is empty! Switching to Automagic Open Extraction (AFO/CHMO inspired)...")
        system_instruction = build_open_extraction_prompt()
    else:
        print("Ontology found. Using Strict Extraction...")
        system_instruction = build_system_prompt(ontology_context)
    
    # 2. Instantiate Gemini
    model = GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=[system_instruction]
    )
    
    # 3. Handle file formats
    contents = []
    
    if gcs_uri.endswith('.xlsx'):
        import pandas as pd
        
        # Parse gcs_uri
        if not gcs_uri.startswith("gs://"):
            raise ValueError(f"gcs_uri must start with 'gs://'. Got: {gcs_uri}")
        
        path_parts = gcs_uri[5:].split("/", 1)
        bucket_name = path_parts[0]
        blob_name = path_parts[1] if len(path_parts) > 1 else ""
        
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Download blob to a temp file in /tmp/
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp_file:
            temp_path = tmp_file.name
            
        try:
            print(f"Downloading {gcs_uri} to temporary path: {temp_path}...")
            blob.download_to_filename(temp_path)
            
            # Read all sheets into a markdown representation to preserve spatial structure
            dfs = pd.read_excel(temp_path, sheet_name=None)
            content = "The following is a Markdown representation of the Excel file:\n\n"
            for sheet_name, df in dfs.items():
                content += f"### Sheet: {sheet_name}\n\n"
                headers = [str(c) for c in df.columns]
                content += "| " + " | ".join(headers) + " |\n"
                content += "| " + " | ".join(["---"] * len(headers)) + " |\n"
                for _, row in df.iterrows():
                    content += "| " + " | ".join([str(x).replace("|", "\\|").replace("\n", " ") if pd.notna(x) else "" for x in row]) + " |\n"
                content += "\n"
            contents = [content]
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        # Determine mime type dynamically
        mime_type, _ = mimetypes.guess_type(gcs_uri)
        if not mime_type:
            if gcs_uri.endswith(".pdf"):
                mime_type = "application/pdf"
            elif gcs_uri.endswith(".png"):
                mime_type = "image/png"
            elif gcs_uri.endswith(".jpg") or gcs_uri.endswith(".jpeg"):
                mime_type = "image/jpeg"
            else:
                mime_type = 'application/octet-stream'
        
        print(f"Passing GCS URI {gcs_uri} directly with mime-type: {mime_type}...")
        document_part = Part.from_uri(uri=gcs_uri, mime_type=mime_type)
        contents = [document_part]
        
    # 4. Execute Extraction (Enforcing JSON output)
    source_filename = os.path.basename(gcs_uri)
    print(f"Executing extraction via Gemini for {source_filename}...")
    response = model.generate_content(
        contents,
        generation_config={"response_mime_type": "application/json", "temperature": 0.0}
    )
    
    parsed_response = json.loads(response.text)
    
    # 5. Insert Extracted Data *only* into Staging landing table
    print(f"Saving extracted triples to {staging_dataset}.raw_extractions_landing...")
    query = f"""
        INSERT INTO `{project_id}.{staging_dataset}.raw_extractions_landing`
        (source_file, extracted_nodes, extracted_edges, unbound_knowledge)
        VALUES (
            @source_file,
            PARSE_JSON(@nodes_str),
            PARSE_JSON(@edges_str),
            PARSE_JSON(@unbound_str)
        )
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("source_file", "STRING", source_filename),
            bigquery.ScalarQueryParameter("nodes_str", "STRING", json.dumps(parsed_response.get("extracted_nodes", []))),
            bigquery.ScalarQueryParameter("edges_str", "STRING", json.dumps(parsed_response.get("extracted_edges", []))),
            bigquery.ScalarQueryParameter("unbound_str", "STRING", json.dumps(parsed_response.get("unbound_knowledge", [])))
        ]
    )
    bq_client.query(query, job_config=job_config).result()
    
    return response.text
