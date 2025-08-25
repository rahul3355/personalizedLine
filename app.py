import streamlit as st
import pandas as pd
import openai
import io

openai.api_key = st.secrets["OPENAI_API_KEY"]

st.title("Excel → Personalized Lines")

# Stripe Paywall (simple hack)
st.markdown("### Free: 50 rows. Upgrade for unlimited → [Pay here](hhttps://buy.stripe.com/3cIcN49c7doffmV0J0bwk06)")

uploaded_file = st.file_uploader("Upload your Excel (XLSX/CSV)", type=["xlsx","csv"])

if uploaded_file:
    # Load file
    if uploaded_file.name.endswith(".csv"):
        df = pd.read_csv(uploaded_file)
    else:
        df = pd.read_excel(uploaded_file)

    # Limit free tier rows
    if len(df) > 50:
        st.warning("⚠ Free tier limited to 50 rows. Upgrade for more.")
        df = df.head(50)

    # Ensure columns exist
    if not {"title","company","company short description"}.issubset([c.lower() for c in df.columns]):
        st.error("Your file must have columns: title, company, company short description")
    else:
        # Process rows
        out_lines = []
        for _, row in df.iterrows():
            title = row.get("title","")
            company = row.get("company","")
            desc = row.get("company short description","")

            prompt = f"As {title} of {company}, LinkedIn can help you {desc} to attract more clients."
            resp = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role":"system","content":"Write one personalized cold email line. Short, natural, one sentence, under 30 words."},
                          {"role":"user","content":prompt}],
                max_tokens=60
            )
            out_lines.append(resp.choices[0].message.content.strip())

        df["personalized_line"] = out_lines

        # Download
        towrite = io.BytesIO()
        df.to_excel(towrite, index=False, engine="openpyxl")
        towrite.seek(0)

        st.download_button(
            "Download processed Excel",
            data=towrite,
            file_name="personalized_output.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
