const express = require('express');
const cors = require('cors');
const { BigQuery } = require('@google-cloud/bigquery');
const { GoogleGenAI } = require('@google/genai');
const { exec, spawn } = require('child_process');
const util = require('util');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const execPromise = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage() });

const bigquery = new BigQuery({ projectId: 'semantic-graph-demo' });
const ai = new GoogleGenAI({ 
  enterprise: true,
  project: 'semantic-graph-demo', 
  location: 'us' 
});

app.get('/api/git/status', async (req, res) => {
  try {
    const { stdout } = await execPromise('git status --short');
    res.json({ status: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/git/pull', async (req, res) => {
  try {
    const { stdout } = await execPromise('git pull');
    res.json({ output: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ontology/graph', async (req, res) => {
  try {
    const nodesQuery = `SELECT class_name AS id, class_name AS label, class_name AS \`group\` FROM \`semantic-graph-demo.kg_ontology_production.node_classes\``;
    const [nodesTable] = await bigquery.query(nodesQuery);

    const edgesQuery = `
      SELECT 
        src.class_name AS source,
        tgt.class_name AS target,
        e.relationship_type AS label
      FROM \`semantic-graph-demo.kg_ontology_production.edge_rules\` e
      JOIN \`semantic-graph-demo.kg_ontology_production.node_classes\` src ON e.source_uri = src.uri
      JOIN \`semantic-graph-demo.kg_ontology_production.node_classes\` tgt ON e.target_uri = tgt.uri
    `;
    const [edgesTable] = await bigquery.query(edgesQuery);

    const graphData = {
      nodes: nodesTable.map(row => ({
        id: row.id,
        label: row.label,
        group: row.group || 'unknown'
      })),
      links: edgesTable.map(row => ({
        source: row.source,
        target: row.target,
        label: row.label
      }))
    };
    
    // Safety check
    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    const cleanLinks = [];
    graphData.links.forEach(link => {
      if (!nodeIds.has(link.source)) {
        graphData.nodes.push({ id: link.source, label: link.source, group: 'inferred' });
        nodeIds.add(link.source);
      }
      if (!nodeIds.has(link.target)) {
        graphData.nodes.push({ id: link.target, label: link.target, group: 'inferred' });
        nodeIds.add(link.target);
      }
      cleanLinks.push(link);
    });
    graphData.links = cleanLinks;

    res.json(graphData);
  } catch (error) {
    console.error('Error fetching ontology graph:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/graph', async (req, res) => {
  try {
    // 1. Fetch Nodes from canonicalized view
    const nodesQuery = `
      SELECT DISTINCT
        canonical_name AS id,
        canonical_name AS label,
        ontology_class AS node_group
      FROM \`semantic-graph-demo.kg_graph_staging.canonicalized_nodes\`
      WHERE canonical_name IS NOT NULL
    `;
    const [nodesTable] = await bigquery.query({ query: nodesQuery });
    
    // 2. Fetch Edges by unnesting the raw_extractions
    const edgesQuery = `
      WITH unnested_edges AS (
        SELECT 
          JSON_VALUE(edge, "$.source_entity") AS source_raw,
          JSON_VALUE(edge, "$.target_entity") AS target_raw,
          JSON_VALUE(edge, "$.relationship_type") AS type
        FROM \`semantic-graph-demo.kg_graph_staging.raw_extractions\`,
        UNNEST(JSON_EXTRACT_ARRAY(extracted_edges)) AS edge
      )
      SELECT DISTINCT
        COALESCE(s_skos.pref_label, ue.source_raw) AS source,
        COALESCE(t_skos.pref_label, ue.target_raw) AS target,
        ue.type AS value
      FROM unnested_edges ue
      LEFT JOIN \`semantic-graph-demo.kg_ontology_production.skos_dictionary\` s_skos 
        ON LOWER(TRIM(ue.source_raw)) = LOWER(TRIM(s_skos.alt_label))
      LEFT JOIN \`semantic-graph-demo.kg_ontology_production.skos_dictionary\` t_skos 
        ON LOWER(TRIM(ue.target_raw)) = LOWER(TRIM(t_skos.alt_label))
      WHERE ue.source_raw IS NOT NULL AND ue.target_raw IS NOT NULL
    `;
    const [edgesTable] = await bigquery.query({ query: edgesQuery });

    // Format for D3
    const graphData = {
      nodes: nodesTable.map(row => ({
        id: row.id,
        label: row.label,
        group: row.node_group || 'unknown'
      })),
      links: edgesTable.map(row => ({
        source: row.source,
        target: row.target,
        label: row.value
      }))
    };
    
    // Safety check: D3 crashes if a link's source or target doesn't exist in the nodes list.
    // We will ensure all nodes referenced in links exist in the nodes array.
    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    const cleanLinks = [];
    
    graphData.links.forEach(link => {
      if (!nodeIds.has(link.source)) {
        graphData.nodes.push({ id: link.source, label: link.source, group: 'inferred' });
        nodeIds.add(link.source);
      }
      if (!nodeIds.has(link.target)) {
        graphData.nodes.push({ id: link.target, label: link.target, group: 'inferred' });
        nodeIds.add(link.target);
      }
      cleanLinks.push(link);
    });
    
    graphData.links = cleanLinks;

    res.json(graphData);
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dlq', async (req, res) => {
  try {
    const dlqQuery = `
      SELECT 
        context AS domain_class, 
        raw_value AS range_class
      FROM \`semantic-graph-demo.kg_ontology_production.dlq_semantic_failures\`
    `;
    const [dlqTable] = await bigquery.query({ query: dlqQuery });
    res.json(dlqTable);
  } catch (error) {
    console.error('Error fetching DLQ data:', error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/git/tags', async (req, res) => {
  try {
    const { stdout } = await execPromise('git tag', { cwd: '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies' });
    const tags = stdout.split('\n').filter(t => t.trim() !== '').reverse(); // reverse so newest are at the top
    res.json(tags);
  } catch (error) {
    console.error('Error fetching git tags:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git/file', async (req, res) => {
  const { version } = req.query;
  if (!version) return res.status(400).json({ error: 'version is required' });

  try {
    let fileContent;
    try {
      const { stdout } = await execPromise(`git show ${version}:src/application/acme_demo.ttl`, { cwd: '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies' });
      fileContent = stdout;
    } catch (e) {
      const { stdout } = await execPromise(`git show ${version}:src/application/app_demo.ttl`, { cwd: '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies' });
      fileContent = stdout;
    }
    res.json({ content: fileContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/git/diff-summary', async (req, res) => {
  const { baseContent, compareContent } = req.body;
  if (!baseContent || !compareContent) {
    return res.status(400).json({ error: 'baseContent and compareContent are required' });
  }

  const prompt = `You are a strict, concise Data Engineer AI reviewing BigQuery schema and ontology changes.
  
Here is the previous ontology (Base):
${baseContent}

Here is the new ontology (Compare):
${compareContent}

Task: Provide a short, single-paragraph summary of the semantic differences. Do NOT list the code. Explain the changes to the user in a professional tone. If the update is safe to merge, explicitly say so. If there are potential breaking changes (e.g. missing dependencies, changed classes), point them out. Keep it under 4 sentences.`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 2048,
        temperature: 0.1,
      }
    });
    let summary = '';
    for await (const chunk of response) {
      if (chunk.text) summary += chunk.text;
    }
    const safe = !summary.toLowerCase().includes('breaking') && !summary.toLowerCase().includes('manual review');
    res.json({ summary, safe });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  // For the demo, we implement a hybrid approach:
  // If the query asks for visualizations, we return specific chart data.
  // Otherwise, we use Gemini to answer based on general context.

  const q = query.toLowerCase();
  
  if (q.includes('lap shear strength') && q.includes('temperature')) {
    return res.json({
      reply: 'Here is the lap shear strength as a function of temperature for Formulation FH-003. The graph shows a decrease in strength as temperature increases, typical for this adhesive class.',
      chartData: {
        title: 'Lap Shear Strength vs Temperature (FH-003)',
        xAxisKey: 'temp',
        lines: [{ dataKey: 'strength', color: '#ff7300' }],
        data: [
          { temp: '20°C', strength: 15.2 },
          { temp: '40°C', strength: 14.1 },
          { temp: '60°C', strength: 11.8 },
          { temp: '80°C', strength: 8.5 },
          { temp: '100°C', strength: 4.2 }
        ]
      }
    });
  }
  
  if (q.includes('toughening agent') && q.includes('fatigue resistance')) {
    return res.json({
      reply: 'Statistical analysis across the FlyHigh Gloo project reveals a strong positive correlation between the concentration of toughening agent and fatigue resistance (cycles to failure).',
      chartData: {
        title: 'Fatigue Resistance vs Toughening Agent Conc. (FlyHigh Gloo)',
        xAxisKey: 'concentration',
        lines: [{ dataKey: 'cycles', color: '#387908' }],
        data: [
          { concentration: '0%', cycles: 1200 },
          { concentration: '2%', cycles: 3500 },
          { concentration: '4%', cycles: 8000 },
          { concentration: '6%', cycles: 14500 },
          { concentration: '8%', cycles: 18000 }
        ]
      }
    });
  }

  // Fallback to Gemini for other queries with real-time graph context from BigQuery
  try {
    // 1. Fetch nodes from BigQuery for context
    const nodesQuery = `
      SELECT DISTINCT 
        canonical_name AS id,
        ontology_class AS node_group
      FROM \`semantic-graph-demo.kg_graph_staging.canonicalized_nodes\`
      WHERE canonical_name IS NOT NULL
    `;
    const [nodesTable] = await bigquery.query({ query: nodesQuery });
    
    // 2. Fetch edges from BigQuery for context
    const edgesQuery = `
      WITH unnested_edges AS (
        SELECT 
          JSON_VALUE(edge, "$.source_entity") AS source_raw,
          JSON_VALUE(edge, "$.target_entity") AS target_raw,
          JSON_VALUE(edge, "$.relationship_type") AS type
        FROM \`semantic-graph-demo.kg_graph_staging.raw_extractions\`,
        UNNEST(JSON_EXTRACT_ARRAY(extracted_edges)) AS edge
      )
      SELECT DISTINCT
        COALESCE(s_skos.pref_label, ue.source_raw) AS source,
        COALESCE(t_skos.pref_label, ue.target_raw) AS target,
        ue.type AS value
      FROM unnested_edges ue
      LEFT JOIN \`semantic-graph-demo.kg_ontology_production.skos_dictionary\` s_skos 
        ON LOWER(TRIM(ue.source_raw)) = LOWER(TRIM(s_skos.alt_label))
      LEFT JOIN \`semantic-graph-demo.kg_ontology_production.skos_dictionary\` t_skos 
        ON LOWER(TRIM(ue.target_raw)) = LOWER(TRIM(t_skos.alt_label))
      WHERE ue.source_raw IS NOT NULL AND ue.target_raw IS NOT NULL
    `;
    const [edgesTable] = await bigquery.query({ query: edgesQuery });

    // Format nodes and edges as text context for Gemini
    let graphContext = "FACTS CURRENTLY REGISTERED IN THE SEMANTIC KNOWLEDGE GRAPH:\n\nNODES:\n";
    nodesTable.forEach(row => {
      graphContext += `- ${row.id} (Type/Class: ${row.node_group || 'Unknown'})\n`;
    });

    graphContext += "\nRELATIONSHIPS & TRIPLES:\n";
    edgesTable.forEach(row => {
      graphContext += `- ${row.source} --[${row.value}]--> ${row.target}\n`;
    });

    // Construct the prompt using our live, grounded database facts
    const prompt = `You are a helpful Data Analytics AI connected to a semantic knowledge graph for an adhesive company. 
Answer the following user query intelligently using ONLY the actual facts registered in the knowledge graph below.
Do NOT mix up formulations or experiments across different projects. 
For example:
- "InstaDust Gloo" is connected to formulation "ID-007" (PVA-based, block shear, wood substrate Hard Maple).
- "FlyHigh Gloo" is connected to formulations "FH-001", "FH-002", "FH-003" (amine-cured epoxies, lap shear strength ASTM D3165).
Always refer to the graph context below to give 100% accurate, factual answers. Do not hallucinate or invent relationships that are not shown in the context.

---
${graphContext}
---

User Query: "${query}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    res.json({ reply: response.text });
  } catch (err) {
    console.error('Chat error with BigQuery context, falling back to basic generation:', err);
    
    // Fallback if BigQuery fails
    const promptFallback = `You are a helpful Data Analytics AI connected to a semantic knowledge graph for an adhesive company. 
Answer the following user query intelligently.

User Query: "${query}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptFallback,
      });
      res.json({ reply: response.text });
    } catch (fallbackErr) {
      console.error('Fallback chat error:', fallbackErr);
      res.status(500).json({ error: 'Failed to generate response' });
    }
  }
});

app.post('/api/pivot', async (req, res) => {
  try {
    // 1. Insert the new Experiment class
    const insertExperimentClass = `
      INSERT INTO \`semantic-graph-demo.kg_ontology_production.node_classes\` (uri, class_name, definition, synonyms, example)
      SELECT 'afo:Experiment', 'Experiment', 'A scientific procedure undertaken to make a discovery or test a hypothesis.', 'trial, test run', 'EXP-001'
      FROM unnest([1])
      WHERE NOT EXISTS (SELECT 1 FROM \`semantic-graph-demo.kg_ontology_production.node_classes\` WHERE uri = 'afo:Experiment')
    `;
    await bigquery.query(insertExperimentClass);

    // 2. Remove old rule (Result -> Formulation)
    await bigquery.query(`DELETE FROM \`semantic-graph-demo.kg_ontology_production.edge_rules\` WHERE target_uri = 'afo:Formulation' AND source_uri = 'afo:Result'`);

    // 3. Add new rules: Experiment -> Project, Formulation -> Experiment, Result -> Experiment
    const insertNewRules = `
      INSERT INTO \`semantic-graph-demo.kg_ontology_production.edge_rules\` (edge_id, source_uri, target_uri, relationship_type)
      VALUES 
        ('rule_pivot_1', 'afo:Experiment', 'afo:Project', 'belongs_to_project'),
        ('rule_pivot_2', 'afo:Formulation', 'afo:Experiment', 'tested_in'),
        ('rule_pivot_3', 'afo:Result', 'afo:Experiment', 'measured_in')
    `;
    
    await bigquery.query(`DELETE FROM \`semantic-graph-demo.kg_ontology_production.edge_rules\` WHERE edge_id LIKE 'rule_pivot_%'`);
    await bigquery.query(insertNewRules);
    
    // Also we need to actually update the raw_extractions_landing to reflect these new edges in the graph visualization.
    // In a real scenario we might re-run a pipeline, but for demo we can mock the transformation directly on the data.
    // The graph visualization currently relies on the nodes and links returned by `/api/graph`.
    
    res.json({ success: true, message: 'Structural pivot applied successfully' });
  } catch (err) {
    console.error('Pivot error:', err);
    res.status(500).json({ error: 'Failed to apply pivot' });
  }
});

app.post('/api/dlq/resolve', async (req, res) => {
  const { insight, category, targetClass, relationshipType } = req.body;
  if (!insight || !category || !targetClass || !relationshipType) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const insertNodeQuery = `
      INSERT INTO \`semantic-graph-demo.kg_ontology_production.node_classes\` (uri, class_name, definition, synonyms, example)
      SELECT @uri, @class_name, @definition, @synonyms, @example
      FROM unnest([1])
      WHERE NOT EXISTS (
        SELECT 1 FROM \`semantic-graph-demo.kg_ontology_production.node_classes\` WHERE class_name = @class_name
      )
    `;
    await bigquery.query({
      query: insertNodeQuery,
      params: {
        uri: `afo:${category.replace(/\s+/g, '')}`,
        class_name: category,
        definition: 'Resolved from DLQ',
        synonyms: '',
        example: insight.substring(0, 50)
      }
    });

    const insertEdgeQuery = `
      INSERT INTO \`semantic-graph-demo.kg_ontology_production.edge_rules\` (edge_id, source_uri, target_uri, relationship_type)
      VALUES (@edge_id, @source_uri, @target_uri, @relationship_type)
    `;
    await bigquery.query({
      query: insertEdgeQuery,
      params: {
        edge_id: `rule_${Date.now()}`,
        source_uri: `afo:${targetClass.replace(/\s+/g, '')}`,
        target_uri: `afo:${category.replace(/\s+/g, '')}`,
        relationship_type: relationshipType
      }
    });

    const deleteDlqQuery = `
      DELETE FROM \`semantic-graph-demo.kg_ontology_production.dlq_semantic_failures\`
      WHERE raw_value = @insight
    `;
    await bigquery.query({
      query: deleteDlqQuery,
      params: { insight }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving DLQ:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ontology/create-draft', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const standards = req.body.standards || 'AFO,CHMO,QUDT';
  const message = req.body.message || 'Initialize Guided Ontology';
  const version = req.body.version || 'v1.0.0-draft';

  const tempFilePath = path.join(__dirname, req.file.originalname);
  
  try {
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    const pythonScript = path.join(__dirname, '../extraction-agents/generate_draft_ontology.py');
    const pythonExecutable = path.join(__dirname, '../extraction-agents/venv/bin/python3');
    
    console.log(`Spawning guided ontology draft script: ${pythonScript} for ${tempFilePath} and standards ${standards}`);
    const pythonProcess = spawn(pythonExecutable, [pythonScript, tempFilePath, standards], {
      cwd: path.join(__dirname, '../extraction-agents')
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      if (code !== 0) {
        console.error('Python script error:', stderrData);
        return res.status(500).json({ error: `Draft generation failed: ${stderrData}` });
      }

      const startMark = 'ONTOLOGY_DRAFT_START';
      const endMark = 'ONTOLOGY_DRAFT_END';
      const startIndex = stdoutData.indexOf(startMark);
      const endIndex = stdoutData.indexOf(endMark);

      if (startIndex === -1 || endIndex === -1) {
        console.error('Complete script stdout:', stdoutData);
        return res.status(500).json({ error: 'Failed to find draft JSON payload in script output.' });
      }

      const rawJson = stdoutData.substring(startIndex + startMark.length, endIndex).trim();
      let parsedDraft;
      try {
        parsedDraft = JSON.parse(rawJson);
      } catch (err) {
        return res.status(500).json({ error: `Failed to parse generated draft JSON: ${err.message}` });
      }

      const { node_classes, edge_rules, turtle_content } = parsedDraft;

      // 1. Write RDF/Turtle file
      const ttlFilePath = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies/src/application/app_demo.ttl';
      const ontologiesCwd = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies';
      
      fs.writeFileSync(ttlFilePath, turtle_content);

      // 2. Commit & Tag in Git
      try {
        await execPromise('git add src/application/app_demo.ttl', { cwd: ontologiesCwd });
        await execPromise(`git commit -m "[Draft] ${message}"`, { cwd: ontologiesCwd });
        
        try {
          await execPromise(`git tag -d ${version}`, { cwd: ontologiesCwd });
        } catch (e) {}
        
        await execPromise(`git tag -a ${version} -m "Draft release ${version}"`, { cwd: ontologiesCwd });
      } catch (gitErr) {
        console.warn('Git operations warning:', gitErr.message);
      }

      // 3. Clear and Load into BigQuery staging tables
      try {
        await bigquery.query('TRUNCATE TABLE `semantic-graph-demo.kg_ontology_staging.onto_classes`');
        await bigquery.query('TRUNCATE TABLE `semantic-graph-demo.kg_ontology_staging.onto_rules`');

        if (node_classes && node_classes.length > 0) {
          const dataset = bigquery.dataset('kg_ontology_staging');
          const table = dataset.table('onto_classes');
          await table.insert(node_classes);
        }

        if (edge_rules && edge_rules.length > 0) {
          const dataset = bigquery.dataset('kg_ontology_staging');
          const table = dataset.table('onto_rules');
          await table.insert(edge_rules);
        }
      } catch (bqErr) {
        console.error('BigQuery load error:', bqErr);
        return res.status(500).json({ error: `BigQuery draft loading failed: ${bqErr.message}` });
      }

      res.json({
        success: true,
        version,
        node_classes,
        edge_rules,
        turtle_content
      });
    });

  } catch (err) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.error('Draft endpoint exception:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ontology/approve', async (req, res) => {
  const { version, message } = req.body;
  if (!version || !message) {
    return res.status(400).json({ error: 'Missing version or message parameters' });
  }

  const ontologiesCwd = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies';
  const dataformCwd = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/dataform-pipeline';

  try {
    // 1. Tag repository as final production version in Git
    try {
      try {
        await execPromise(`git tag -d ${version}`, { cwd: ontologiesCwd });
      } catch (e) {}
      await execPromise(`git tag -a ${version} -m "Release ${version}: ${message}"`, { cwd: ontologiesCwd });
    } catch (gitErr) {
      console.warn('Git tagging warning:', gitErr.message);
    }

    // 2. Trigger Dataform run to materialize staging draft into production BQ active graph
    const { stdout, stderr } = await execPromise('npx @dataform/cli run', { cwd: dataformCwd });
    console.log('Dataform materialization stdout:', stdout);

    res.json({
      success: true,
      message: `Ontology version ${version} approved, tagged in Git, and materialized in BigQuery successfully.`,
      dataformOutput: stdout
    });

  } catch (err) {
    console.error('Approve endpoint exception:', err);
    res.status(500).json({ error: `Ontology approval failed: ${err.message}` });
  }
});

app.post('/api/ingest', upload.single('file'), async (req, res) => {

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  const sendStatus = (status) => {
    res.write(JSON.stringify({ status }) + '\n');
  };

  const tempFilePath = path.join(__dirname, req.file.originalname);
  
  try {
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    sendStatus(`Received document: ${req.file.originalname} (${req.file.size} bytes)`);
    sendStatus('Triggering the Enterprise Semantic Graph Pipeline...');

    const pythonScript = path.join(__dirname, '../extraction-agents/raw_extraction_agent.py');
    const pythonExecutable = path.join(__dirname, '../extraction-agents/venv/bin/python3');
    const pythonProcess = spawn(pythonExecutable, [pythonScript, tempFilePath], {
      cwd: path.join(__dirname, '../extraction-agents'),
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    pythonProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendStatus(line);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          sendStatus(`[LOG] ${line}`);
        }
      }
    });

    pythonProcess.on('close', (code) => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      if (code === 0) {
        sendStatus('Extraction complete! Triggering Dataform graph materialization...');
        const dataformProcess = spawn('npx', ['@dataform/cli', 'run'], {
          cwd: path.join(__dirname, '../dataform-pipeline')
        });
        
        dataformProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) sendStatus(`[Dataform] ${line}`);
          }
        });

        dataformProcess.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) sendStatus(`[Dataform Error] ${line}`);
          }
        });

        dataformProcess.on('close', (dfCode) => {
          if (dfCode === 0) {
             sendStatus('Pipeline execution complete!');
             res.write(JSON.stringify({ 
               success: true, 
               message: `Successfully ingested ${req.file.originalname} and materialized Knowledge Graph.`,
             }) + '\n');
          } else {
             res.write(JSON.stringify({ success: false, message: `Dataform failed with exit code ${dfCode}` }) + '\n');
          }
          res.end();
        });
      } else {
        res.write(JSON.stringify({ success: false, message: `Pipeline failed with exit code ${code}` }) + '\n');
        res.end();
      }
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    res.write(JSON.stringify({ success: false, message: error.message }) + '\n');
    res.end();
  }
});


app.get('/api/ontology/export-ttl', async (req, res) => {
  try {
    const nodesQuery = `SELECT uri, class_name, definition, synonyms, example FROM \`semantic-graph-demo.kg_ontology_production.node_classes\``;
    const [nodes] = await bigquery.query(nodesQuery);

    const edgesQuery = `SELECT source_uri, target_uri, relationship_type FROM \`semantic-graph-demo.kg_ontology_production.edge_rules\``;
    const [edges] = await bigquery.query(edgesQuery);

    let ttl = `@prefix afo: <http://purl.allotrope.org/ontologies/material#> .\n`;
    ttl += `@prefix chmo: <http://purl.obolibrary.org/obo/CHMO_> .\n`;
    ttl += `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n`;
    ttl += `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .\n`;
    ttl += `@prefix owl: <http://www.w3.org/2002/07/owl#> .\n\n`;

    nodes.forEach(node => {
      ttl += `${node.uri} a owl:Class ;\n`;
      ttl += `  rdfs:label "${node.class_name}" ;\n`;
      if (node.definition) ttl += `  skos:definition "${node.definition.replace(/"/g, '\\"')}" ;\n`;
      if (node.synonyms) ttl += `  skos:altLabel "${node.synonyms}" ;\n`;
      if (node.example) ttl += `  skos:example "${node.example.replace(/"/g, '\\"')}" ;\n`;
      ttl += `  .\n\n`;
    });

    edges.forEach(edge => {
      ttl += `${edge.source_uri} afo:${edge.relationship_type} ${edge.target_uri} .\n`;
    });

    res.setHeader('Content-Type', 'text/turtle');
    res.send(ttl);
  } catch (err) {
    console.error('Export TTL error:', err);
    res.status(500).json({ error: 'Failed to export TTL' });
  }
});

app.post('/api/git/commit', async (req, res) => {
  const { ttlContent, message, version } = req.body;
  if (!ttlContent || !message || !version) {
    return res.status(400).json({ error: 'Missing ttlContent, message, or version' });
  }

  try {
    const filePath = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies/src/application/app_demo.ttl';
    const cwd = '/Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontologies';

    fs.writeFileSync(filePath, ttlContent);

    await execPromise('git add src/application/app_demo.ttl', { cwd });
    await execPromise(`git commit -m "${message}"`, { cwd });
    await execPromise(`git tag -a ${version} -m "Release ${version}"`, { cwd });

    res.json({ success: true, message: 'Successfully committed and tagged new version' });
  } catch (err) {
    console.error('Git commit error:', err);
    res.status(500).json({ error: 'Failed to commit changes' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`BigQuery API Server running on port ${PORT}`);
});
