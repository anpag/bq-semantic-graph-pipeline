import rdflib
import time
import logging

def extract_bfo_restrictions(owl_file_path: str):
    print(f"Loading raw Asserted Graph: {owl_file_path}...")
    g = rdflib.Graph()
    logging.getLogger("rdflib").setLevel(logging.ERROR)
    
    start_load = time.time()
    g.parse(owl_file_path, format="xml")
    print(f"Loaded in {time.time() - start_load:.2f} seconds.")
    
    OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#")
    RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#")

    # 1. Build a fast lookup dictionary for human-readable labels
    class_labels = {}
    prop_labels = {}
    
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.Class)):
        if not isinstance(s, rdflib.term.BNode):
            label = g.value(s, RDFS.label)
            class_labels[s] = str(label) if label else str(s).split('#')[-1].split('/')[-1]
            
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.ObjectProperty)):
        if not isinstance(s, rdflib.term.BNode):
            label = g.value(s, RDFS.label)
            prop_labels[s] = str(label) if label else str(s).split('#')[-1].split('/')[-1]

    # 2. Extract BFO/OWL Restrictions (The hidden Domain/Range rules)
    print("\nWalking through owl:Restriction Blank Nodes to extract topological rules...")
    extracted_rules = set()
    
    # We look at every Class in the ontology (The Domain)
    for domain_class, domain_label in class_labels.items():
        # Find everything this class is a subClassOf
        for subclass_target in g.objects(domain_class, RDFS.subClassOf):
            # If the target is a Blank Node, it might be a Restriction!
            if isinstance(subclass_target, rdflib.term.BNode):
                # Is it an owl:Restriction?
                if (subclass_target, rdflib.RDF.type, OWL.Restriction) in g:
                    # Find the Property (The Edge)
                    on_property = g.value(subclass_target, OWL.onProperty)
                    # Find the Target Class (The Range)
                    some_values = g.value(subclass_target, OWL.someValuesFrom)
                    all_values = g.value(subclass_target, OWL.allValuesFrom)
                    
                    target_range = some_values or all_values
                    
                    # If we found all three pieces, we successfully extracted a hidden rule!
                    if on_property and target_range:
                        edge_label = prop_labels.get(on_property, str(on_property).split('#')[-1].split('/')[-1])
                        # Sometimes the target range is another complex Blank Node (like an intersection).
                        # For simplicity, we only map it if it points to a named class.
                        range_label = class_labels.get(target_range)
                        
                        if range_label:
                            extracted_rules.add((domain_label, edge_label, range_label))
                            
    print(f"\n======================================")
    print(f"Total BFO Restriction Rules Extracted: {len(extracted_rules)}")
    print(f"======================================\n")
    
    print("Sample of hidden topological rules successfully extracted for BigQuery:")
    for rule in list(extracted_rules)[:10]:
        print(f"  [{rule[0]}] -[{rule[1]}]-> [{rule[2]}]")
        
if __name__ == "__main__":
    extract_bfo_restrictions("../knowledge_hub/ontology/obi_master.owl")
