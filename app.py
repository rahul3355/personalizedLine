import streamlit as st
from backend.app import db
import create_new, past_files

st.set_page_config(page_title="Personalized Outreach Tool", layout="wide")

# ---------- Init ----------
init_db()

# TEMP: hardcode current user until Next.js login is integrated
current_user_id = "dev-user-123"

# ---------- Navigation ----------
PAGES = {
    "Create New": create_new,
    "Past Files": past_files,
}

choice = st.sidebar.radio("Choose Page", list(PAGES.keys()))
PAGES[choice].render(current_user_id)   # pass user_id instead of user
