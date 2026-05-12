# Lessons Learned: Enterprise Ontology Scaling & BigQuery Graphs

## 1. The BigQuery Property Graph Constraint (1000 Table Limit)
When attempting to implement **Virtual Semantic Mapping** (creating a dedicated virtual Node/Edge table for every single class and property in the ontology to optimize graph traversal), we hit a hard architectural limit in BigQuery:
> `bigquery error: Too many tables, views and user-defined functions for query: Max: 1000`

**Conclusion:** For enterprise ontologies that can scale to tens or hundreds of thousands of classes, it is structurally impossible to hardcode every class into the `CREATE PROPERTY GRAPH` DDL using `NODE TABLES` and `EDGE TABLES`.

## 2. The Universal Triplet Pattern vs. Cartesian Explosion
To bypass the 1000-table limit, we must use the **Universal Triplet** pattern:
```sql
CREATE PROPERTY GRAPH kg_graph
NODE TABLES ( global_nodes )
EDGE TABLES ( global_edges )
```
*Issue:* Previously, running open-ended queries (e.g., `MATCH (e:Experiment)-[:investigates]->(m:Molecule)`) on universal tables caused severe performance degradation and timeouts due to Cartesian explosions during full table scans.

## 3. The Solution: Hybrid Semantic Graph Architecture
To achieve infinite ontology scaling *and* high-performance graph traversal, we implemented a two-step Hybrid Semantic Graph approach:

### A. Physical Layer: Clustered Universal Tables
We physically store the data in the `global_nodes` and `global_edges` tables, but we strictly **Cluster** them.
- `global_nodes` is clustered by `ontology_class`
- `global_edges` is clustered by `relationship_type` and `source_node_id`

### B. Resolution Layer: Vector Search
Instead of hardcoding class names in the graph definition or agent prompt, the agent uses `VECTOR_SEARCH` against the `onto_classes` dictionary (using BigQuery ML and `text-embedding-005`). This accurately resolves natural language intent (e.g., "Centrifuge") to the exact, validated ontology class string.

### C. Execution Layer: Explicit Filter Pushdown
The resolved class strings are injected directly into the `WHERE` clause of the ISO GQL `MATCH` statement:
```sql
MATCH (exp)-[rel]->(machine)
WHERE machine.ontology_class = 'Centrifuge'
```
**Result:** The BigQuery query optimizer uses the underlying table clustering to instantly prune the data before performing the graph traversal. The query executes in milliseconds without hitting the 1000-table alias limit and without risking Cartesian timeouts.

## 4. Agent Tooling Constraints
When implementing RAG on top of this graph:
- **Explicit Hops:** We learned that tacit unstructured knowledge (e.g., issue summaries) lives in `node_knowledge_artifacts`. Queries must explicitly hop from the core entity (like Experiment) to the artifact: `(e) -[:informs]-> (art)`.
- **Tool Documentation Prioritization:** When executing vector searches, standard experimental SOPs can easily outrank specific UI tool manuals (like the SolMate UI guide). Tool usage guides either need higher embedding weight, a separate retrieval path, or structured metadata tags to ensure the agent finds the precise instructions.