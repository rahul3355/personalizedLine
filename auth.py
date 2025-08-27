# auth.py
import streamlit as st
from streamlit_supabase_auth import login_form, logout_button

def _normalize_user(session: dict | None) -> dict | None:
    if not session:
        return None

    if "user" in session and isinstance(session["user"], dict):
        u = session["user"]
        uid = (
            u.get("id")
            or u.get("user_id")
            or u.get("sub")
            or u.get("provider_id")
        )
        return {"id": uid, "email": u.get("email"), "raw": session}

    uid = session.get("id") or session.get("sub") or session.get("user_id")
    return {"id": uid, "email": session.get("email"), "raw": session}

def require_user() -> dict:
    # ✅ only show Google login
    session = login_form(providers=["google"])
    user = _normalize_user(session)
    if not user:
        st.stop()
    return user

def sign_out_button() -> None:
    # ✅ no arguments
    logout_button()
