"""One command to bring the database up to date: extract -> transform -> load.

    python refresh.py            # the current season (extract.py's default)
    python refresh.py 2026-27    # a specific season

Loads into local Postgres, or into RDS when DATABASE_URL is set (see scripts/rds_env.sh).
Safe to run as often as you like: load.py upserts, so reruns don't duplicate rows.
"""
import subprocess
import sys

season = sys.argv[1:]  # [] or ["2026-27"]; extract.py and transform.py both accept it

steps = [("extract.py", season), ("transform.py", season), ("load.py", [])]

for script, args in steps:
    print(f"\n=== {script} {' '.join(args)}".rstrip() + " ===")
    result = subprocess.run([sys.executable, script, *args])
    if result.returncode != 0:
        sys.exit(f"{script} failed (exit code {result.returncode}). Stopping, nothing after it ran.")

print("\nrefresh done")
