# Commands

Run everything from `~/NBA-Project`.

## Python environment

```bash
source .venv/bin/activate     # run in every new terminal; prompt shows (.venv)
deactivate                    # leave the venv
pip install <package>         # install into the venv
pip freeze > requirements.txt # save installed versions
```

## Data pipeline

```bash
python extract.py     # NBA.com -> season_exports/*.csv   (raw, gitignored)
python transform.py   # season_exports -> processed/*.csv (clean, gitignored)
```

Run `extract.py` first on a fresh checkout. The CSVs are gitignored.

## App

```bash
uvicorn server:app --port 3001 --reload   # FastAPI backend (docs at /docs)
npm run dev                               # Vite frontend at localhost:5173
npm run typecheck                         # TypeScript check
npm run build                             # type check + production build
```

## PostgreSQL

```bash
createdb nba_project      # make the project's database
psql nba_project          # open it (SQL ends with ;)
dropdb nba_project        # delete it (start over)
brew services start postgresql@14   # start the server
brew services stop postgresql@14    # stop it
brew services list                  # is it running?
```

Inside `psql`:

| Command | Does |
| --- | --- |
| `\l` | list databases |
| `\c name` | switch database |
| `\dt` | list tables |
| `\d table` | show a table's columns and keys |
| `\i file.sql` | run a SQL file |
| `\q` | quit |

## Git

```bash
git status                # what changed
git add <files>           # stage specific files (avoid `git add -A`)
git commit -m "message"   # commit
git push origin main      # push (ask first, per CLAUDE.md)
git pull                  # get changes from GitHub
```

## Terraform (when you get there)

```bash
cd infrastructure
terraform init       # download providers
terraform plan       # preview changes. Always read this first.
terraform apply      # make the changes. Only after reviewing the plan.
```
