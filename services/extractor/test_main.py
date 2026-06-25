import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import sys
import os

# Ensure the services/extractor directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app

class TestExtractorAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("main.extraction_agent.extract_triples")
    def test_extract_success(self, mock_extract):
        # Configure mock to return a valid simulated JSON response
        mock_extract.return_value = '{\n  "extraction_plan": "Mock plan",\n  "extracted_nodes": [\n    {"entity_name": "Node 1", "ontology_class": "Class A", "raw_properties": {}},\n    {"entity_name": "Node 2", "ontology_class": "Class B", "raw_properties": {}}\n  ],\n  "extracted_edges": [],\n  "unbound_knowledge": []\n}'
        
        payload = {
            "gcs_uri": "gs://my-bucket/documents/paper.pdf",
            "project_id": "test-project",
            "staging_dataset": "test_staging"
        }
        response = self.client.post("/extract", json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("Extraction completed and materialized", data["message"])
        self.assertIsNotNone(data["extraction_result"])
        
        # Verify mock data structure
        result = data["extraction_result"]
        self.assertIn("extracted_nodes", result)
        self.assertIn("extracted_edges", result)
        self.assertIn("unbound_knowledge", result)
        self.assertEqual(len(result["extracted_nodes"]), 2)
        
        # Verify mock was called with correct parameters
        mock_extract.assert_called_once_with(
            gcs_uri="gs://my-bucket/documents/paper.pdf",
            project_id="test-project",
            staging_dataset="test_staging"
        )

    def test_extract_invalid_uri(self):
        payload = {
            "gcs_uri": "https://storage.googleapis.com/my-bucket/documents/paper.pdf",
            "project_id": "test-project",
            "staging_dataset": "test_staging"
        }
        response = self.client.post("/extract", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("gcs_uri must start with", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
