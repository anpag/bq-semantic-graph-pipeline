WITH mock_ai_processing AS (
  -- Simulate a SUCCESSFUL Gemini Output
  SELECT 
    'file_123' AS file_id, 1 AS page_num,
    '{"candidates":[{"content":{"parts":[{"text":"{\\"extracted_nodes\\":[{\\"node_name\\":\\"Toluene\\",\\"ontology_class\\":\\"Substance:Solvent\\",\\"properties\\":\\"{\\\\\\"temperature\\\\\\": \\\\\\"20C\\\\\\"}\\"}],\\"extracted_edges\\":[],\\"unbound_insights\\":[]}"}]}}]}' AS ai_output
  UNION ALL
  -- Simulate a FAILED Gemini Output (Malformed JSON: missing a closing brace and quotes)
  SELECT 
    'file_456' AS file_id, 2 AS page_num,
    '{"candidates":[{"content":{"parts":[{"text":"{\\"extracted_nodes\\":[{\\"node_name\\":\\"Broken_Data\\",\\"ontology_class\\":\\"Oops"}]}}]}' AS ai_output
),
parsed_processing AS (
  SELECT 
    file_id,
    page_num,
    JSON_VALUE(ai_output, '$.candidates[0].content.parts[0].text') AS raw_json_string,
    SAFE.PARSE_JSON(JSON_VALUE(ai_output, '$.candidates[0].content.parts[0].text')) AS parsed_json
  FROM mock_ai_processing
)
-- Display the DLQ Routing Results
SELECT 
  file_id,
  page_num,
  CASE 
    WHEN parsed_json IS NULL THEN 'ROUTED TO DLQ (FAILED PARSE)'
    ELSE 'ROUTED TO MAIN TABLE (SUCCESS)'
  END AS routing_destination,
  raw_json_string
FROM parsed_processing;
