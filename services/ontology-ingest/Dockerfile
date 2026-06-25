# Use a modern, slim Python base image
FROM python:3.11-slim

# Install Java Runtime Environment (JRE)
# owlready2's sync_reasoner() launches the HermiT Java reasoner, requiring Java at runtime.
RUN apt-get update && \
    mkdir -p /usr/share/man/man1 && \
    apt-get install -y --no-install-recommends default-jre && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the ingestion script
COPY ingest.py .

# Set the entrypoint so the container can be run as a Job, accepting CLI arguments
ENTRYPOINT ["python", "ingest.py"]
