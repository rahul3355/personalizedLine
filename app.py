import streamlit as st
from auth import require_user, sign_out_button
from db import init_db
import create_new, past_files

st.set_page_config(page_title="Personalized Outreach Tool", layout="wide")

# ---------- Init + Auth ----------
init_db()
user = require_user()   # ✅ Google enforced
sign_out_button()

# ---------- Navigation ----------
PAGES = {
    "Create New": create_new,
    "Past Files": past_files,
}

choice = st.sidebar.radio("Choose Page", list(PAGES.keys()))
PAGES[choice].render(user)   # pass user into page
