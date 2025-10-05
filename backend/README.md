# Backend Overview

## Streaming row counting

The `/parse_headers` and `/jobs` endpoints now stream Supabase storage files to
temporary files before inspecting them. CSV inputs are counted with Python's
`csv` module while XLSX inputs use `openpyxl.load_workbook(read_only=True)`, so
row counts are computed without loading entire files into memory.
