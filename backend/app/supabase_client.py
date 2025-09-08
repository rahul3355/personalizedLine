import httpx

# Monkeypatch: remove unsupported "proxy" argument
_orig_init = httpx.Client.__init__

def _patched_init(self, *args, **kwargs):
    kwargs.pop("proxy", None)  # drop proxy argument if present
    return _orig_init(self, *args, **kwargs)

httpx.Client.__init__ = _patched_init


import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
