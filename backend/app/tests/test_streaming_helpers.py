import csv
from pathlib import Path

import pytest
from openpyxl import Workbook

from backend.app.file_streaming import (
    count_csv_rows,
    count_xlsx_rows,
    extract_csv_headers,
    extract_xlsx_headers,
)


@pytest.fixture()
def tmp_csv(tmp_path: Path) -> Path:
    path = tmp_path / "data.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["col_a", "col_b"])
        for i in range(5):
            writer.writerow([i, i + 1])
    return path


@pytest.fixture()
def tmp_xlsx(tmp_path: Path) -> Path:
    path = tmp_path / "data.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.append(["col_a", "col_b"])
    for i in range(7):
        ws.append([i, i + 2])
    wb.save(path)
    wb.close()
    return path


def test_csv_helpers(tmp_csv: Path):
    assert extract_csv_headers(str(tmp_csv)) == ["col_a", "col_b"]
    assert count_csv_rows(str(tmp_csv)) == 5


def test_xlsx_helpers(tmp_xlsx: Path):
    assert extract_xlsx_headers(str(tmp_xlsx)) == ["col_a", "col_b"]
    assert count_xlsx_rows(str(tmp_xlsx)) == 7
