FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by psycopg (binary)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway injects $PORT at runtime)
EXPOSE 8000

# Start the FastAPI server — Railway overrides PORT via env var
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
