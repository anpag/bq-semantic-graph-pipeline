import rdflib
import owlrl
import time
import logging

def compute_all_rules(owl_file_path: str):
    print(f"Loading raw Asserted Graph: {owl_file_path}...")
    g = rdflib.Graph()
    logging.getLogger("rdflib").setLevel(logging.ERROR)
    
    start_load = time.time()
    g.parse(owl_file_path, format="xml")
    print(f"Loaded in {time.time() - start_load:.2f} seconds.")
    
    OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#")
    RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#")

    # 1. Count Explicit Rules (The lazy human author rules)
    raw_rules = set()
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.ObjectProperty)):
        for d in g.objects(s, RDFS.domain):
            for r in g.objects(s, RDFS.range):
                if not isinstance(d, rdflib.term.BNode) and not isinstance(r, rdflib.term.BNode):
                    raw_rules.add((str(s), str(d), str(r)))
                
    print(f"Raw explicitly written Domain/Range Rules: {len(raw_rules)}")

    # 2. Run the Reasoner
    print("\nExecuting OWL 2 RL Reasoner (This may take 1-3 minutes for massive files)...")
    start_reason = time.time()
    
    # We use RDFS Semantics which handles the SubClass and SubProperty inheritance chains
    owlrl.DeductiveClosure(owlrl.RDFS_Semantics).expand(g)
    
    print(f"Reasoning complete in {time.time() - start_reason:.2f} seconds.")

    # 3. Count Inferred Rules (The mathematically proven rules)
    inferred_rules = set()
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.ObjectProperty)):
        for d in g.objects(s, RDFS.domain):
            for r in g.objects(s, RDFS.range):
                if not isinstance(d, rdflib.term.BNode) and not isinstance(r, rdflib.term.BNode):
                    inferred_rules.add((str(s), str(d), str(r)))
                
    print(f"\n======================================")
    print(f"Total Precomputed Rules for BigQuery Bouncer:")
    print(f"  {len(inferred_rules)} mathematically valid relationship combinations.")
    print(f"======================================\n")
    
if __name__ == "__main__":
    compute_all_rules("../knowledge_hub/ontology/obi_master.owl")
