import os
import json
import csv
import PyPDF2
from google import genai
from google.genai import types

def load_massive_rules():
    print("Loading 105,000+ Master Rules...")
    rules = []
    try:
        with open('knowledge_hub/ontology/onto_rules_massive.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rules.append({
                    "domain": row['domain_label'].lower(),
                    "edge": row['edge_label'].lower(),
                    "range": row['range_label'].lower()
                })
    except Exception as e:
        print(f"Failed to load rules: {e}")
    return rules

def filter_rules_for_prompt(rules, relevant_classes):
    filtered_rules = []
    classes_lower = [c.lower() for c in relevant_classes]
    
    for r in rules:
        if r['domain'] in classes_lower and r['range'] in classes_lower:
            filtered_rules.append(f"[{r['domain']}] -[{r['edge']}]-> [{r['range']}]")
            
    return list(set(filtered_rules))[:150] 

def simulate_enterprise_pipeline(pdf_path):
    print(f"--- Enterprise Pipeline RAG Simulation ---")
    
    client = genai.Client()
    master_rules = load_massive_rules()

    print("\n[Phase 1] Reading PDF Document into Memory...")
    try:
        reader = PyPDF2.PdfReader(pdf_path)
        with open(pdf_path, "rb") as f:
            doc_data = f.read()
    except Exception as e:
        print(f"ERROR: Could not read PDF at {pdf_path}: {e}")
        return
        
    document_part = types.Part.from_bytes(data=doc_data, mime_type="application/pdf")

    # PHASE 2: Dynamic Router
    print("\n[Phase 2] Executing Global Router (Entity Dictionary Generation)...")
    router_prompt = """
    You are an Enterprise Knowledge Graph Architect. Read this entire document.
    
    TASK: Build a Master Entity Dictionary for this document.
    Identify the primary entities (Molecules, Solvents, Reagents, Equipment, Diseases, Assays) discussed.
    For each entity, determine its strict Canonical Name (e.g., 'Toluene').
    Identify ANY synonyms, acronyms, or lot numbers used in the text to refer to that entity (e.g., 'Toluol', 'lot_123').
    
    Output ONLY a valid JSON object matching this schema:
    {
      "global_context_summary": "A 1-2 sentence technical summary of the document's purpose.",
      "entity_dictionary": [
        {
          "canonical_name": "String (The standard scientific name)",
          "ontology_class": "String (choose from: chemical entity, material entity, device, assay, data item, process)",
          "synonyms_used_in_text": ["String"]
        }
      ]
    }
    """
    
    try:
        router_response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=[document_part, router_prompt],
            config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json")
        )
        global_data = json.loads(router_response.text)
        global_context = global_data.get('global_context_summary')
        dictionary_json = json.dumps(global_data.get("entity_dictionary", []), indent=2)
        
        print("\n=== GLOBAL DOCUMENT CONTEXT ===")
        print(f"Summary: {global_context}")
        print("\n=== MASTER ENTITY DICTIONARY ===")
        for entity in global_data.get("entity_dictionary", []):
            print(f" - {entity['canonical_name']} [{entity.get('ontology_class')}] (Synonyms: {entity['synonyms_used_in_text']})")
    except Exception as e:
        print(f"Router failed: {e}")
        return

    # Extract the classes Gemini dynamically identified
    expected_classes = list(set([e.get('ontology_class', '').lower() for e in global_data.get("entity_dictionary", [])]))
    # Add foundational classes
    for fc in ["chemical entity", "material entity", "device", "assay", "data item", "process"]:
        if fc not in expected_classes: expected_classes.append(fc)

    print(f"\n[Phase 2.5] Filtering the massive rulebook via RAG...")
    targeted_rules = filter_rules_for_prompt(master_rules, expected_classes)
    print(f"Filtered 105,000 rules down to {len(targeted_rules)} highly relevant, mathematically valid topological rules for this page.")
    rules_menu = "\n".join([f"- {r}" for r in targeted_rules])

    print(f"\n[Phase 3] Executing Extraction with Strict RAG Topological Constraints...")
    
    # Process pages 1 and 2
    for page_num in range(1, 3):
        print(f"\n--- Processing Page {page_num} ---")
        
        extraction_prompt = f"""
        You are a strict Data Extraction Agent.
        Analyze ONLY the contents of PAGE {page_num} of the provided document.
        
        GLOBAL CONTEXT: {global_context}
        MASTER ENTITY DICTIONARY: {dictionary_json}

        TASK: Extract Generic Triples. 
        You MUST assign an `ontology_class` to every node from this list: {expected_classes}
        
        CRITICAL OBI TOPOLOGY RULE:
        You are ONLY allowed to extract edges that perfectly match the Domain, Range, and Property combination of one of the following rules:
        
        APPROVED TOPOLOGICAL RULES:
        {rules_menu}
        
        CRITICAL: If you find an entity matching a synonym in the Dictionary, use the `canonical_name` and `ontology_class`.

        Output ONLY a valid JSON object matching this schema:
        {{
          "extracted_edges": [
            {{
              "source_node_name": "String",
              "source_ontology_class": "String",
              "target_node_name": "String",
              "target_ontology_class": "String",
              "ontological_relationship": "String"
            }}
          ]
        }}
        """
        
        try:
            extract_response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=[document_part, extraction_prompt],
                config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json")
            )
            
            try:
                extracted_data = json.loads(extract_response.text)
            except json.JSONDecodeError:
                print(f"  [DLQ ALERT] Malformed JSON.")
                continue

            edges = extracted_data.get("extracted_edges", [])
            
            if not edges:
                print("  No edges extracted.")
                continue
                
            for edge in edges:
                source_class = edge.get('source_ontology_class', '').lower()
                target_class = edge.get('target_ontology_class', '').lower()
                rel = edge.get('ontological_relationship', '').lower()
                
                triple = f"[{source_class}] -[{rel}]-> [{target_class}]"
                print(f"  Extracted Edge: {edge.get('source_node_name')} -> {edge.get('target_node_name')}")
                print(f"  Topology Used:  {triple}")
                
                is_valid = False
                for r in master_rules:
                    if r['domain'] == source_class and r['edge'] == rel and r['range'] == target_class:
                        is_valid = True
                        break
                        
                if is_valid:
                    print("  ✅ [SAVED TO GRAPH] BigQuery Validation Passed.")
                else:
                    print("  ❌ [DLQ ALERT] The LLM hallucinated an illegal rule.")
                print("-" * 40)
                
        except Exception as e:
            print(f"  [Error] {e}")

if __name__ == "__main__":
    pdf = "path/to/your/document.pdf"
    simulate_enterprise_pipeline(pdf)
