# Pistoia Alliance Process Graph Ontology (PGO) - Enterprise Distilled

This document provides a highly comprehensive, LLM-optimized representation of the core concepts, sub-classes, and ontological constraints derived from the [Pistoia Alliance PGO (v1.0)](https://github.com/Pistoia-Alliance-Inc/Pistoia-Alliance-PGO) and related standard biomedical ontologies (e.g., OBI, ChEBI, NCIT). 

It defines the strict vocabulary of Nodes, Edges, and Properties that the AI MUST use when extracting complex scientific knowledge graphs from unstructured text.

---

## 1. Core Node Classes & Allowed Sub-Classes

When extracting a Node, you MUST assign it to one of the **Core Classes** below. If the text provides enough detail, you SHOULD append the most accurate **Sub-Class** using the format `CoreClass:SubClass` (e.g., `Assay:In_Vitro`, `Substance:Solvent`).

### 1.1 Assays & Experiments
**Core Class: `Assay`**
*Definition:* A planned process with the objective to produce information about a material entity by physically examining it.
*   **Sub-Class `In_Vitro`**: Assays performed with microorganisms, cells, or biological molecules outside their normal biological context.
*   **Sub-Class `In_Vivo`**: Assays performed within a living organism.
*   **Sub-Class `Analytical_Measurement`**: Processes designed to quantify specific chemical or physical properties (e.g., HPLC, Mass Spectrometry, NMR).
*   **Sub-Class `Crystallization_Screen`**: Processes designed to identify or produce solid polymorphic forms of a substance.

### 1.2 Chemical Entities & Materials
**Core Class: `Compound`**
*Definition:* A substance formed by chemical union of two or more elements. Usually reserved for active pharmaceutical ingredients or target molecules.
*   **Sub-Class `Small_Molecule`**: Low molecular weight organic compounds.
*   **Sub-Class `Macromolecule`**: Large, complex molecules like peptides or nucleic acids.

**Core Class: `Substance`**
*Definition:* Any matter of defined composition that has discrete existence. Used for reagents, solvents, and environmental materials.
*   **Sub-Class `Solvent`**: A substance that dissolves a solute resulting in a solution.
*   **Sub-Class `Reagent`**: A substance or compound added to a system to cause a chemical reaction, or added to test if a reaction occurs.
*   **Sub-Class `Catalyst`**: A substance that increases the rate of a chemical reaction without itself undergoing any permanent chemical change.
*   **Sub-Class `Buffer`**: An aqueous solution consisting of a mixture of a weak acid and its conjugate base.

### 1.3 Biological Entities
**Core Class: `Protein`**
*Definition:* A linear polymer of amino acids joined by peptide bonds.
*   **Sub-Class `Enzyme`**: Proteins that act as biological catalysts.
*   **Sub-Class `Receptor`**: Proteins that receive and transduce signals.

**Core Class: `Gene`**
*Definition:* A functional unit of heredity.

**Core Class: `Cell`**
*Definition:* The smallest units of living structure capable of independent existence.
*   **Sub-Class `Cell_Line`**: A permanently established cell culture that will proliferate indefinitely.

**Core Class: `Biospecimen`**
*Definition:* Material sample taken from a biological entity for testing or diagnostic purposes.
*   **Sub-Class `Tissue`**: An ensemble of similar cells and their extracellular matrix.
*   **Sub-Class `Biofluid`**: Liquids originating from inside the bodies of living people (e.g., blood, plasma, serum).

### 1.4 Clinical & Disease Entities
**Core Class: `Disease`**
*Definition:* A definite pathologic process with a characteristic set of signs and symptoms.
*   **Sub-Class `Oncology`**: Diseases involving abnormal cell growth with the potential to invade or spread.
*   **Sub-Class `Immunology`**: Diseases affecting the immune system.

**Core Class: `Indication`**
*Definition:* A health problem or disease that is identified as likely to be benefited by a therapy.

**Core Class: `Drug`**
*Definition:* Any substance which when absorbed into a living organism may modify one or more of its functions for therapeutic purposes.
*   **Sub-Class `Approved_Drug`**: A pharmaceutical product authorized by a regulatory body.
*   **Sub-Class `Investigational_Drug`**: A substance being tested in clinical trials.

### 1.5 Equipment & Metrics
**Core Class: `Device`**
*Definition:* An object contrived for a specific purpose (e.g., laboratory equipment, manufacturing machinery).
*   **Sub-Class `Bioreactor`**: A manufactured device or system that supports a biologically active environment.
*   **Sub-Class `Chromatograph`**: Equipment used to separate mixtures.
*   **Sub-Class `Sensor`**: A device that measures a physical property.

**Core Class: `Biomarker`**
*Definition:* A characteristic that can be objectively measured as an indicator for biologic processes.

**Core Class: `Unit`**
*Definition:* A standardized quantity of a physical property.
*   **Sub-Class `Concentration`**: e.g., mg/mL, Molar.
*   **Sub-Class `Temperature`**: e.g., Celsius, Kelvin.
*   **Sub-Class `Time`**: e.g., hours, minutes.

---

## 2. Core Edge Relationships (Predicates)

When linking the Nodes defined above, you MUST strictly use the following semantic predicates to represent the relationship.

### 2.1 Experimental & Operational Edges
*   **`investigates`**: Used when a study, project, or assay focuses on a specific compound, drug, or disease. 
    *   *Rule:* `Assay` -> `investigates` -> `Compound | Disease`
*   **`uses`**: Used when a process, assay, or experiment utilizes a specific device, material, or substance to perform its function.
    *   *Rule:* `Assay` -> `uses` -> `Device | Substance`
*   **`measures`**: Used when an assay or sensor quantifies a specific property, biomarker, or outcome.
    *   *Rule:* `Assay | Device` -> `measures` -> `Biomarker | Unit`
*   **`produces`**: Used when a manufacturing process, reaction, or assay results in the creation of a new physical entity.
    *   *Rule:* `Assay` -> `produces` -> `Compound | Substance`

### 2.2 Chemical & Physical Edges
*   **`dissolves_in`**: Used to indicate solubility relationships between a solute and a solvent.
    *   *Rule:* `Compound` -> `dissolves_in` -> `Substance:Solvent`
*   **`reacts_with`**: Used to indicate a chemical interaction between two entities.
    *   *Rule:* `Compound` -> `reacts_with` -> `Compound | Substance:Reagent`
*   **`has_ingredient`**: Used to define the composition of a complex mixture or formulated product.
    *   *Rule:* `Pharmaceutical_product` -> `has_ingredient` -> `Compound | Substance`
*   **`has_polymorph`**: Used to indicate that a compound can exist in a specific crystalline structure.
    *   *Rule:* `Compound` -> `has_polymorph` -> `Compound` (with specific polymorphic properties)

### 2.3 Biological & Clinical Edges
*   **`targets`**: Used when a drug or compound is designed to interact with a specific biological entity (usually a protein or gene).
    *   *Rule:* `Drug | Compound` -> `targets` -> `Protein | Gene`
*   **`treats`**: Used when a drug is administered to mitigate a specific indication or disease.
    *   *Rule:* `Drug` -> `treats` -> `Disease | Indication`
*   **`derived_from`**: Used to trace the lineage of biological samples or cell lines back to their source species or tissue.
    *   *Rule:* `Biospecimen | Cell` -> `derived_from` -> `Species | Biospecimen:Tissue`
*   **`expressed_in`**: Used to indicate where a gene or protein is actively produced within an organism.
    *   *Rule:* `Gene | Protein` -> `expressed_in` -> `Cell | Biospecimen`

---

## 3. Extraction Guidelines & Node Properties

When generating the `properties` JSON string for a Node, you MUST encapsulate tacit knowledge, observed values, and status flags into that field.

**Property Extraction Rules:**
1.  **Values & Units:** If a node is associated with a specific measurement (e.g., a temperature of 20°C), include it in the properties: `{"temperature": "20", "unit": "Celsius"}`.
2.  **Observations:** If the text describes a visual or physical observation related to a node (e.g., "the solution turned cloudy"), capture it: `{"observation": "solution turned cloudy"}`.
3.  **Hazards/Risks:** If a substance has an associated hazard statement, embed it: `{"hazard_statement": "Highly flammable liquid"}`.
4.  **Performance Status:** If an assay concludes that a solvent or process was successful or unsuccessful, explicitly state it: `{"performance_status": "Successful", "reason": "High yield achieved"}`.