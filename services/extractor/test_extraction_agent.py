import json
import unittest
from unittest.mock import patch, MagicMock

# Import the refactored function
from extraction_agent import extract_triples, build_system_prompt

class TestExtractionAgent(unittest.TestCase):

    @patch('extraction_agent.storage.Client')
    @patch('extraction_agent.bigquery.Client')
    @patch('extraction_agent.GenerativeModel')
    @patch('extraction_agent.Part')
    @patch('extraction_agent.initialize_vertex')
    @patch('extraction_agent.fetch_ontology_context')
    def test_extract_triples_pdf(self, mock_fetch_context, mock_init_vertex, mock_part, mock_generative_model, mock_bq_client, mock_storage_client):
        # Mock ontology context fetch
        mock_fetch_context.return_value = ("MOCKED ONTOLOGY CONTEXT", False)
        
        # Mock the GenerativeModel
        mock_model_instance = MagicMock()
        mock_generative_model.return_value = mock_model_instance
        
        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "extracted_nodes": [{"entity_name": "TestEntity", "ontology_class": "TestClass", "raw_properties": {}}],
            "extracted_edges": [],
            "unbound_knowledge": []
        })
        mock_model_instance.generate_content.return_value = mock_response
        
        # Mock Part.from_uri
        mock_part_instance = MagicMock()
        mock_part.from_uri.return_value = mock_part_instance
        
        # Run extract_triples with PDF
        result_json = extract_triples(
            gcs_uri="gs://mock-bucket/test-doc.pdf",
            project_id="test-project",
            staging_dataset="kg_staging"
        )
        result = json.loads(result_json)
        
        # Assertions
        self.assertEqual(len(result["extracted_nodes"]), 1)
        self.assertEqual(result["extracted_nodes"][0]["entity_name"], "TestEntity")
        
        # Verify Part.from_uri was called correctly
        mock_part.from_uri.assert_called_once_with(uri="gs://mock-bucket/test-doc.pdf", mime_type="application/pdf")
        
        # Verify BigQuery query execution
        mock_bq_client.return_value.query.assert_called_once()
        args, kwargs = mock_bq_client.return_value.query.call_args
        query_str = args[0]
        self.assertIn("INSERT INTO `test-project.kg_staging.raw_extractions_landing`", query_str)

    @patch('extraction_agent.storage.Client')
    @patch('extraction_agent.bigquery.Client')
    @patch('extraction_agent.GenerativeModel')
    @patch('extraction_agent.initialize_vertex')
    @patch('extraction_agent.fetch_ontology_context')
    @patch('pandas.read_excel')
    @patch('tempfile.NamedTemporaryFile')
    @patch('os.path.exists')
    @patch('os.remove')
    def test_extract_triples_xlsx(self, mock_os_remove, mock_os_exists, mock_temp_file, mock_read_excel, mock_fetch_context, mock_init_vertex, mock_generative_model, mock_bq_client, mock_storage_client):
        # Mock ontology context fetch
        mock_fetch_context.return_value = ("MOCKED ONTOLOGY CONTEXT", False)
        
        # Mock GenerativeModel
        mock_model_instance = MagicMock()
        mock_generative_model.return_value = mock_model_instance
        
        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "extracted_nodes": [{"entity_name": "SheetEntity", "ontology_class": "SheetClass", "raw_properties": {}}],
            "extracted_edges": [],
            "unbound_knowledge": []
        })
        mock_model_instance.generate_content.return_value = mock_response
        
        # Mock GCS Storage download
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        mock_storage_client.return_value.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Mock temp file creation
        mock_temp_instance = MagicMock()
        mock_temp_instance.name = "/tmp/mock_temp_file.xlsx"
        mock_temp_file.return_value.__enter__.return_value = mock_temp_instance
        
        # Mock pandas excel reading
        import pandas as pd
        mock_df = pd.DataFrame({"Col1": ["Val1"]})
        mock_read_excel.return_value = {"Sheet1": mock_df}
        
        mock_os_exists.return_value = True
        
        # Run extract_triples with XLSX
        result_json = extract_triples(
            gcs_uri="gs://mock-bucket/test-sheet.xlsx",
            project_id="test-project",
            staging_dataset="kg_staging"
        )
        result = json.loads(result_json)
        
        # Assertions
        self.assertEqual(len(result["extracted_nodes"]), 1)
        self.assertEqual(result["extracted_nodes"][0]["entity_name"], "SheetEntity")
        
        # Verify download occurred
        mock_storage_client.return_value.bucket.assert_called_once_with("mock-bucket")
        mock_bucket.blob.assert_called_once_with("test-sheet.xlsx")
        mock_blob.download_to_filename.assert_called_once_with("/tmp/mock_temp_file.xlsx")
        
        # Verify temp file cleanup
        mock_os_remove.assert_called_once_with("/tmp/mock_temp_file.xlsx")

if __name__ == '__main__':
    unittest.main()
