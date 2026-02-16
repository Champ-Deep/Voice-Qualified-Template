FROM python:3.11-alpine

WORKDIR /app

# Install dependencies
COPY simple_app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY simple_app/app.py .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Railway will set this
ENV PORT=5000

EXPOSE $PORT

CMD ["python", "app.py"]
