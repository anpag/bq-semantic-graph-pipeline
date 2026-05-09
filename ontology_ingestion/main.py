import os
import rdflib
import json
import sys

def parse_and_measure_ontology(owl_file_path: str):
    print(f"Parsing massive ontology file: {owl_file_path}...")
    
    g = rdflib.Graph()
    # Muting warning logs from rdflib for cleaner output
    import logging
    logging.getLogger("rdflib").setLevel(logging.ERROR)
    
    g.parse(owl_file_path, format="xml")
    
    OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#")
    RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#")

    onto_classes = []
    
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.Class)):
        # Filter out Blank Nodes (BNode). We only want URIRefs (named classes).
        if isinstance(s, rdflib.term.BNode):
            continue
            
        label = g.value(s, RDFS.label)
        class_name = str(label) if label else str(s).split('#')[-1].split('/')[-1]
        
        onto_classes.append({
            "uri": str(s),
            "class_name": class_name
        })
        
    print(f"\n--- EXTRACTION RESULTS ---")
    print(f"Total Named Classes Found: {len(onto_classes)}")
    
    # Calculate byte size
    json_payload = json.dumps(onto_classes)
    size_in_bytes = len(json_payload.encode('utf-8'))
    size_in_mb = size_in_bytes / (1024 * 1024)
    
    print(f"Estimated BigQuery Payload Size: {size_in_bytes} bytes ({size_in_mb:.2f} MB)")
    print(f"--------------------------\n")
    
    print("Sample of 10 extracted named classes:")
    # Print the first 10 classes that actually have human-readable labels
    for c in [x for x in onto_classes if len(x['class_name']) > 5][:10]:
        print(f"  - {c['class_name']} ({c['uri']})")

if __name__ == "__main__":
    parse_and_measure_ontology("../knowledge_hub/ontology/obi_master.owl")
