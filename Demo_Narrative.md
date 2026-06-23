# Google Cloud Semantic Knowledge Graph - Ultimate Demo Narrative & Script

This document provides a highly detailed, step-by-step guide for presenting the Enterprise Semantic Knowledge Graph demo. It aligns perfectly with the approved storyline, detailing exactly what actions to take in the UI and the corresponding script to deliver.

---

## ✅ Pre-flight Checklist (CRITICAL - DO NOT SKIP)
Before the audience arrives, you MUST ensure the environment is a completely blank slate:
1. Ensure the Node.js frontend server is running (`npm run dev` or `node server.cjs`).
2. Ensure BigQuery tables (`node_classes`, `edge_rules`, `raw_extractions`, etc.) are truncated. The `Ontology Explorer` and `Knowledge Graph Explorer` tabs MUST be completely empty.

---

## 📌 Scene 1: Automagic Ontology Generation (The "FlyHigh" File)
**Goal:** Show that we don't need a pre-existing schema. The system can read unstructured experimental data and generate a foundational semantic ontology completely on its own.

**Exactly What You Have To Do:**
1. Navigate to the **"Data Ingestion"** (or Dashboard) tab.
2. Ensure the audience sees that the Knowledge Graph and Ontology tabs are currently empty (you can click them quickly to show the blank slates).
3. On the Ingestion tab, click the upload area, select the **`FlyHigh.pdf`** (or Excel) file, and click **"Upload & Process"**.
4. While it processes, deliver the script below.
5. Once processed, immediately navigate to the **"Ontology Explorer"** tab to show the newly generated structural blueprint.
6. Then, navigate to the **"Knowledge Graph Explorer"** tab to show the newly extracted nodes and edges.

**What You Have To Say (Script):**
> *"Our journey begins with a common challenge: a pile of experimental data locked in documents. Here, I have our initial 'FlyHigh' file, packed with experimental results. Watch what happens when I upload it."*
> 
> *(Upload the file)*
> 
> *"The moment it’s submitted, Vertex AI isn't just reading the text. It is automagically generating a foundational base ontology all on its own. Let's look at the Ontology Explorer. See this? The system inferred the schema—what a Formulation is, what a Test is—from scratch."*
> 
> *"And if we go to the Knowledge Graph Explorer, we can see the actual experimental data from FlyHigh mapped perfectly into this newly born semantic network."*

---

## 📌 Scene 2: Handling Messy Realities (The "HotDump" File)
**Goal:** Prove the system's resilience. Show how it adapts to new attributes, catches errors, and flags data quality issues without breaking.

**Exactly What You Have To Do:**
1. Navigate back to the **"Data Ingestion"** tab.
2. Upload the **`HotDump`** file.
3. Once processed, navigate to the **"Dead Letter Queue (DLQ)"** tab.
4. Point to the specific anomalies caught by the system (the hidden errors/conflicts).
5. Navigate briefly back to the **"Ontology Explorer"** to show how the ontology gracefully expanded to include the new attributes from HotDump.

**What You Have To Say (Script):**
> *"But R&D data isn't always clean. To test how the system handles messy realities, we are now going to upload the 'HotDump' file. This file contains brand new attributes the system hasn't seen before, but it also contains a few hidden errors and conflicts."*
> 
> *(Upload HotDump)*
> 
> *"Instead of crashing, watch the system adapt. It automatically updates the ontology to accommodate the new attributes. More importantly, it detects those hidden errors. Here in the Data Quality Dashboard (DLQ), you can see the system raised clear alerts for the data conflicts, keeping our core knowledge graph pristine."*

---

## 📌 Scene 3: Format Flexibility (InstaDust & Unstructured Files)
**Goal:** Demonstrate that the system is completely agnostic to data format.

**Exactly What You Have To Do:**
1. Navigate to the **"Data Ingestion"** tab.
2. Upload the **`InstaDust`** file (a structured tabular layout).
3. Next, upload a completely unstructured **PDF** file.
4. Finally, upload the **handwritten** document image.
5. After all are ingested, navigate to the **"Knowledge Graph Explorer"** and spin the massive 3D graph to show how massive and interconnected the data corpus has become.

**What You Have To Say (Script):**
> *"Next, we need to prove the platform's flexibility with different data structures. First, I'll upload the 'InstaDust' file. This shows the system can seamlessly handle various structured tabular layouts."*
> 
> *"But we want to push the boundaries further. I'm now uploading a complex unstructured PDF report. And to top it off, I'm uploading an image of a handwritten lab note."*
> 
> *"If we look at the Knowledge Graph now, you can see all of it—tabular, PDF, and handwritten data—harmonized into one massive, searchable semantic network. Unstructured data is no sweat for this system."*

---

## 📌 Scene 4: Conversing with the Data (Search & External Integration)
**Goal:** Transition to the Conversational Analytics tab to show how scientists can actually interact with this harmonized data.

**Exactly What You Have To Do:**
1. Navigate to the **"AI Analytics Chat"** tab.
2. Type exactly: `What info do you have on Fatigue Resistance of FH-001?` and hit Enter.
3. Wait for the response.
4. Type exactly: `Do we have a formulation without adhesive failure in the ASTM D3165 experiment?` and hit Enter.

**What You Have To Say (Script):**
> *"Once the system has ingested all this data, we start asking it questions. We begin simply. I'll ask: 'What info do you have on Fatigue Resistance of FH-001?'"*
> 
> *(Wait for answer)*
> 
> *"This perfectly highlights how easy it is to access specific data elements. Now let's get more complex: 'Do we have a formulation without adhesive failure in the ASTM D3165 experiment?'"*
> 
> *(Wait for answer)*
> 
> *"This step shows off the deep semantic search capabilities. Notice how the system can also integrate with external data, like searching the web to fill in gaps regarding standard ASTM methodologies that might not be fully detailed in our internal files."*

---

## 📌 Scene 5: Visual Analytics & Statistical Correlation
**Goal:** Prove this isn't just a text bot. It is a mathematical engine capable of generating visualizations and running statistical correlations via Text-to-SQL.

**Exactly What You Have To Do:**
1. In the **"AI Analytics Chat"** tab, type exactly: `What is the lap shear strength as a function of temperature in FH-003?`
2. Let the Recharts graph render on the screen.
3. Type exactly: `What impact does the concentration of a toughening agent have on fatigue resistance across the FlyHigh Gloo project?`

**What You Have To Say (Script):**
> *"Moving from text to visuals, I'll ask: 'What is the lap shear strength as a function of temperature in FH-003?'"*
> 
> *"Instead of just giving me a text summary, the system writes exact SQL against our BigQuery graph to visualize this data, pulling insights across the entire data corpus."*
> 
> *"Let's dive into statistical analysis. I'll ask: 'What impact does the concentration of a toughening agent have on fatigue resistance across the FlyHigh Gloo project?'"*
> 
> *"You can see the system effortlessly cross-reference ingredients against test outcomes to correlate the data and give us an immediate, mathematically accurate answer."*

---

## 📌 Scene 6: The Dynamic Ontology Pivot
**Goal:** Show how easily the underlying data model can be restructured without breaking the application, highlighting the flexibility of Semantic Graphs over rigid SQL schemas.

**Exactly What You Have To Do:**
1. Navigate to the **"Ontology Explorer"** tab.
2. (If the UI supports this directly) Execute the ontology change: Restructure the nodes so that "Tests" and "Formulations" are now grouped under a new "Experiment" node. Alternatively, trigger the backend script/API that runs this migration.
3. Once updated, navigate back to the **"AI Analytics Chat"** tab.
4. Run the exact same query from Scene 5: `What is the lap shear strength as a function of temperature in FH-003?` to prove it still works perfectly.

**What You Have To Say (Script):**
> *"Then comes a major structural pivot. In a traditional database, changing the schema takes months of data engineering. We decide to completely change the underlying ontology right now."*
> 
> *"Instead of having 'Tests' directly attached to 'Formulations,' we introduce a new 'Experiment' grouping within Projects that houses Formulations, Tests, and Decisions."*
> 
> *(Execute the change)*
> 
> *"The key takeaway here is that the ontology changed dynamically. And if we go back and ask our analytics questions again, you'll see it didn't break any of the analytics capabilities we just used. The analytics engine simply navigates the new semantic paths."*

---

## 📌 Scene 7: Exporting & Version Control
**Goal:** Prove the platform integrates with downstream systems and that the schema is version-controlled for enterprise safety.

**Exactly What You Have To Do:**
1. Navigate to the **"Knowledge Graph Explorer"** (or Export tab).
2. Create a filter/selection for a new project called **"Superflybaby"**.
3. Apply a filter to pull in only Experiments that involve "Peel tests".
4. Click the **"Export"** or **"Download"** button to simulate exporting this batch back out.
5. Finally, navigate to the **"Version Control (History)"** tab.
6. Show the commit history of the `.ttl` ontology files.

**What You Have To Say (Script):**
> *"To wrap things up, we put the system's exporting capabilities to the test. We create a brand new project called Superflybaby."*
> 
> *"We tell the system to pull in every Experiment that involves Peel tests. We then successfully download that specific batch of structured data back out. This proves the system's interfacing and data conversion skills—it's not a walled garden."*
> 
> *"Finally, we conclude by exploring the versioning of the ontology. Every change we made today is tracked in Git, leaving a safe, auditable door open for future updates. Thank you."*
