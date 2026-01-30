FROM python:3.12-slim-bookworm

WORKDIR /app

# Install system dependencies
# libpq-dev is required for psycopg2 (PostgreSQL)
# gcc/g++ required for building some python extensions
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements file
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies
# We use --no-cache-dir to keep image small
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the application
COPY . /app/

# Switch to backend directory for Django commands
WORKDIR /app/backend

# Collect static files
# We set dummy environment variables so Django can load settings without a real DB during build
RUN SECRET_KEY=building_static_files \
    DATABASE_URL=postgres://dummy:dummy@dummy:5432/dummy \
    python manage.py collectstatic --noinput

# Define the command to run the application
# We use sh -c to allow variable expansion for $PORT
CMD ["sh", "-c", "echo 'Container started!' && echo 'Running migrate...' && python manage.py migrate && echo 'Starting Gunicorn...' && gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --log-level debug"]
