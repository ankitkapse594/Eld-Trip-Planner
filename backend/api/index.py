"""
Vercel serverless WSGI entry point.
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so 'config' can be resolved
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
