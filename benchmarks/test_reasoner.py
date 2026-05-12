import rdflib
import owlrl
import time

def test_reasoner(owl_file_path: str):
    print(f"Loading raw Asserted Graph: {owl_file_path}")
    g = rdflib.Graph()
    import logging
    logging.getLogger("rdflib").setLevel(logging.ERROR)
    
    g.parse(owl_file_path, format="xml")
    
    # Namespaces
    OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#")
    RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#")

    # 1. Measure the raw Asserted Graph rules (What we did previously)
    raw_rules = set()
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.ObjectProperty)):
        for d in g.objects(s, RDFS.domain):
            for r in g.objects(s, RDFS.range):
                raw_rules.add(f"{s} | {d} | {r}")
                
    print(f"Asserted Graph explicit rules found: {len(raw_rules)}")

    # 2. Run the Deductive Reasoner
    print("\nExecuting OWL 2 RL Reasoner (Materializing inferred rules...)")
    start_time = time.time()
    
    # Expand the graph with inferred triples
    owlrl.DeductiveClosure(owlrl.OWLRL_Semantics).expand(g)
    
    end_time = time.time()
    print(f"Reasoning complete in {end_time - start_time:.2f} seconds.")

    # 3. Measure the Inferred Graph rules
    inferred_rules = set()
    for s, p, o in g.triples((None, rdflib.RDF.type, OWL.ObjectProperty)):
        for d in g.objects(s, RDFS.domain):
            for r in g.objects(s, RDFS.range):
                inferred_rules.add(f"{s} | {d} | {r}")
                
    print(f"\nInferred Graph materialized rules found: {len(inferred_rules)}")
    print(f"Rule dictionary expansion: +{len(inferred_rules) - len(raw_rules)} new semantic rules calculated.")
    
    # Sample a new inferred rule
    new_rules = list(inferred_rules - raw_rules)
    if new_rules:
        print("\nSample of a mathematically inferred rule that was hidden in the raw file:")
        print(new_rules[0])

if __name__ == "__main__":
    # We test with a small mock file first to show the mechanics without waiting 20 minutes for OBI to process.
    mock_owl = """<?xml version="1.0"?>
    <rdf:RDF xmlns="http://mock/" xml:base="http://mock/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
        <owl:Ontology rdf:about="http://mock/"/>
        
        <owl:Class rdf:about="#Process"/>
        <owl:Class rdf:about="#Assay"> <rdfs:subClassOf rdf:resource="#Process"/> </owl:Class>
        
        <owl:Class rdf:about="#Material"/>
        <owl:Class rdf:about="#Solvent"> <rdfs:subClassOf rdf:resource="#Material"/> </owl:Class>
        
        <!-- The Parent Property has a strict domain and range -->
        <owl:ObjectProperty rdf:about="#uses">
            <rdfs:domain rdf:resource="#Process"/>
            <rdfs:range rdf:resource="#Material"/>
        </owl:ObjectProperty>
        
        <!-- The Sub Property has NO explicit domain/range in the raw file -->
        <owl:ObjectProperty rdf:about="#uses_solvent">
            <rdfs:subPropertyOf rdf:resource="#uses"/>
        </owl:ObjectProperty>
    </rdf:RDF>
    """
    with open("mock.owl", "w") as f:
        f.write(mock_owl)
        
    test_reasoner("mock.owl")
