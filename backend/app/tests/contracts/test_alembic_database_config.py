"""Ensure Alembic CLI migrations use the same database as the application."""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[3]


def run_alembic_migration(data_dir: Path, *, database_url: str | None = None) -> None:
    data_dir.mkdir(parents=True)
    environment = os.environ.copy()
    environment.pop("DATABASE_URL", None)
    environment["PHOTOMAP_DATA_DIR"] = str(data_dir)
    if database_url is not None:
        environment["DATABASE_URL"] = database_url

    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        check=True,
        cwd=BACKEND_DIR,
        env=environment,
        capture_output=True,
        text=True,
        timeout=90,
    )


def assert_migrated_database(database_path: Path) -> None:
    assert database_path.is_file()
    with sqlite3.connect(database_path) as connection:
        version = connection.execute("SELECT version_num FROM alembic_version").fetchone()
    assert version is not None


def test_alembic_cli_uses_photomap_data_dir_without_database_url(tmp_path: Path) -> None:
    data_dir = tmp_path / "configured-data"

    run_alembic_migration(data_dir)

    assert_migrated_database(data_dir / "app.db")


def test_alembic_cli_prefers_explicit_database_url(tmp_path: Path) -> None:
    data_dir = tmp_path / "unused-data"
    explicit_database = tmp_path / "explicit.db"

    run_alembic_migration(data_dir, database_url=f"sqlite:///{explicit_database}")

    assert_migrated_database(explicit_database)
    assert not (data_dir / "app.db").exists()
