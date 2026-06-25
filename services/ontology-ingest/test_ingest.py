import unittest
from unittest.mock import patch, MagicMock, call
import sys
import os

# Ensure the directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import ingest

class TestOntologyIngest(unittest.TestCase):
    @patch("ingest.bigquery.Client")
    @patch("ingest.rdflib.Graph")
    @patch("ingest.owlready2")
    @patch("ingest.os.remove")  # Mock file cleanup
    @patch("ingest.tempfile.NamedTemporaryFile")
    def test_ingest_success(self, mock_tempfile, mock_remove, mock_owlready, mock_rdflib_graph, mock_bq_client):
        # 1. Setup BigQuery Mocks
        mock_bq = MagicMock()
        mock_bq_client.return_value = mock_bq
        
        # Mock dataset and table metadata retrieval/update
        mock_dataset = MagicMock()
        mock_bq.get_dataset.return_value = mock_dataset
        mock_table = MagicMock()
        mock_bq.get_table.return_value = mock_table

        # 2. Setup Temporary File Mocks
        mock_temp_instance = MagicMock()
        mock_temp_instance.name = "/tmp/mock_temp_xml.xml"
        mock_tempfile.return_value.__enter__.return_value = mock_temp_instance

        # 3. Setup rdflib Mocks
        mock_g_init = MagicMock()
        mock_g_reasoned = MagicMock()
        # Side effect to return g_init for pre-parsing, then g_reasoned for parsing the reasoned output
        mock_rdflib_graph.side_effect = [mock_g_init, mock_g_reasoned]

        # Simulate finding some ontology classes and properties in the reasoned graph
        # We mock subjects/objects/value to return dummy URIs and labels
        OWL_Class = MagicMock()
        mock_g_reasoned.subjects.return_value = [
            "http://example.org/ontology#Formulation",
            "http://example.org/ontology#Test"
        ]
        
        # Mock property discovery with a robust argument-based dynamic mock
        def mock_subjects_lookup(rdf_type_param, owl_type_param):
            owl_type_str = str(owl_type_param)
            if "Class" in owl_type_str:
                return ["http://example.org/ontology#Formulation", "http://example.org/ontology#Test"]
            elif "ObjectProperty" in owl_type_str:
                return ["http://example.org/ontology#undergoes_test"]
            elif "DatatypeProperty" in owl_type_str:
                return ["http://example.org/ontology#hasValue"]
            return []

        mock_g_reasoned.subjects.side_effect = mock_subjects_lookup

        # Mock label and metadata lookups
        def mock_value_lookup(subject, predicate):
            # Simple mapping to return dummy labels and definitions
            subj_str = str(subject)
            pred_str = str(predicate)
            if "label" in pred_str:
                return subj_str.split("#")[-1]
            if "definition" in pred_str:
                return f"Definition of {subj_str.split('#')[-1]}"
            return None

        mock_g_reasoned.value.side_effect = mock_value_lookup
        mock_g_reasoned.objects.return_value = [] # Simplify domains/ranges for this test

        # 4. Setup owlready2 Mocks
        mock_onto = MagicMock()
        mock_owlready.get_ontology.return_value = mock_onto
        mock_onto.load.return_value = mock_onto

        # 5. Run Ingestion
        ingest.ingest_ontology(
            owl_file_path="mock_ontology.ttl",
            project_id="test-project",
            dataset_id="test_staging",
            version_info="v1.2.3"
        )

        # 6. Verifications
        # Verify BQ Client initialization
        mock_bq_client.assert_called_once_with(project="test-project")
        
        # Verify dataset description was updated with version
        mock_bq.get_dataset.assert_called_once()
        self.assertEqual(mock_dataset.description, "Ontology Staging Dataset. Current Version: v1.2.3")
        mock_bq.update_dataset.assert_called_once_with(mock_dataset, ["description"])

        # Verify BQ load_table_from_json was called 3 times (classes, rules, data properties)
        self.assertEqual(mock_bq.load_table_from_json.call_count, 3)
        
        # Verify the correct tables were targeted
        calls = mock_bq.load_table_from_json.call_args_list
        self.assertIn("test-project.test_staging.onto_classes", calls[0][0][1])
        self.assertIn("test-project.test_staging.onto_rules", calls[1][0][1])
        self.assertIn("test-project.test_staging.onto_data_properties", calls[2][0][1])

        # Verify table descriptions were updated
        self.assertEqual(mock_bq.update_table.call_count, 3)

if __name__ == "__main__":
    unittest.main()
