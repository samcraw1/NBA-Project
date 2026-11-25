CREATE TABLE teams (
    team_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    nickname TEXT,
    city TEXT,
    state TEXT,
    year_founded INTEGER
);

CREATE TABLE players (
    player_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN
);

