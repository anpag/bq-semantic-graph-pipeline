#!/bin/bash
set -e

echo "========================================="
echo "🔄 Resetting Demo Environment..."
echo "========================================="

echo "1. Truncating Active Graph & Extractions in BigQuery..."
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_ontology_production.node_classes\`"
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_ontology_production.edge_rules\`"
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_graph_staging.raw_extractions_landing\`"
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_ontology_production.dlq_semantic_failures\`"
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_ontology_staging.onto_classes\`"
bq query --use_legacy_sql=false "TRUNCATE TABLE \`semantic-graph-demo.kg_ontology_staging.onto_rules\`"
echo "✅ BigQuery tables cleared."

echo "2. Resetting Git Repository..."
cd /Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies

# Ensure we are on main
git checkout main || git checkout -b main

# Delete all existing tags
TAGS_TO_DELETE=$(git tag || true)
if [ ! -z "$TAGS_TO_DELETE" ]; then
  echo "$TAGS_TO_DELETE" | xargs -r git tag -d
fi

# Write an empty TTL baseline
cat <<EOF > src/application/app_demo.ttl
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix app: <http://example.org/ontology#> .

# Initial Blank Ontology State
EOF

git add src/application/app_demo.ttl
git commit -m "Reset to blank slate" || true
git tag -a v1.0.0 -m "Base Empty State"

echo "✅ Git repository reset to blank state."

echo "========================================="
echo "🎉 Demo Environment Ready!"
echo "========================================="
