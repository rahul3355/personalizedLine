import os, time, streamlit as st
from db import list_jobs, get_progress, get_job

def render(user):
    st.header("Your Past Files")
    jobs = list_jobs(user["id"], limit=50)

    if not jobs:
        st.info("No files yet.")
        return

    for job in jobs:
        created = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(job["created_at"]))
        finished = job["finished_at"]
        finished = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(finished)) if finished else "—"

        st.write(f"**{job['filename']}** ({job['rows']} rows) – {job['status']}")
        st.caption(f"Uploaded: {created} | Finished: {finished}")

        if job["status"] == "running":
            progress_ph = st.empty()
            status_ph = st.empty()
            percent, msg = get_progress(job["id"])
            progress_ph.progress((percent or 0) / 100)
            status_ph.caption(f"In progress: {msg or 'Working...'} ({percent or 0}%)")

            for _ in range(120):
                time.sleep(2)
                percent, msg = get_progress(job["id"])
                progress_ph.progress((percent or 0) / 100)
                status_ph.caption(f"In progress: {msg or 'Working...'} ({percent or 0}%)")

                j = get_job(job["id"])
                if j and j.get("status") != "running":
                    st.rerun()
                    break

        elif job["status"] == "succeeded":
            st.success("Done – ready to download")
            if job["result_path"]:
                try:
                    with open(job["result_path"], "rb") as fh:
                        st.download_button(
                            "Download File",
                            data=fh.read(),
                            file_name=os.path.basename(job["result_path"]),
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            key=f"dl-{job['id']}",
                        )
                except FileNotFoundError:
                    st.error("Output file not found on disk.")

        elif job["status"] == "failed":
            st.error("Failed – check and retry")

        elif job["status"] == "queued":
            st.warning("Waiting to start…")

        st.markdown("---")
