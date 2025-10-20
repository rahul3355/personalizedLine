import httpx

# Monkeypatch: remove unsupported "proxy" argument
_orig_init = httpx.Client.__init__

def _patched_init(self, *args, **kwargs):
    kwargs.pop("proxy", None)  # drop proxy argument if present
    return _orig_init(self, *args, **kwargs)

httpx.Client.__init__ = _patched_init


import os
from dotenv import load_dotenv
from supabase import create_client
from supabase.lib.client_options import ClientOptions

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client_options = ClientOptions(
    storage_client_timeout=120,
    http_client_timeout=httpx.Timeout(
        timeout=120.0,
        connect=10.0,
        read=120.0,
        write=120.0,
        pool=None,
    ),
)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY, options=client_options)
