# Ontology UI & API Server

This project contains the frontend and backend services for the Enterprise Ontology and Knowledge Graph Demo.

---

## Prerequisites

Before starting, make sure you are in the `ontology-ui` directory:
```bash
cd /Users/antoniopaulino/dev/git/bq-semantic-graph-pipeline/ontology-ui
```

Ensure you have Node.js (v18+) and npm installed.

---

## 🚀 How to Run

To run the full application, you need to start both the **Express Backend** and the **Vite Frontend**.

### 1. Run the Express Backend Server
The backend handles BigQuery queries, schema operations, and Git-based ontology release tracking.

From the `ontology-ui` directory, run:
```bash
node server.cjs
```
- **Port:** `3001`
- **Verification:** You should see `BigQuery API Server running on port 3001` printed in your terminal.

### 2. Run the Vite Frontend Dev Server
The frontend is a React application that displays the interactive knowledge graphs, DLQ failures, and version control dashboards.

From the `ontology-ui` directory, run:
```bash
npm run dev
```
- **Port:** `5173`
- **URL:** [http://localhost:5173/](http://localhost:5173/)

---

## 🛠️ Dev Notes & Configuration

- **BigQuery Integration**: The backend uses the `@google-cloud/bigquery` library, which automatically leverages your local Google Cloud SDK credentials (`gcloud auth application-default login`).
- **Git Release Management**: The API triggers git commits, tags, and file-handling operations inside the adjacent `ontologies` folder to release new version lineages of the OWL/TTL files.
