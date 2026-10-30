import React, { useEffect, useState } from "react";
//import the nba endpoint
//import other things

function FrontEnd(){
const [searchquery, setSetSearchQuery] = useState("");
const [players, setPlayers] = useState<{ playerName: string; pts: number }[]>([]);


const [gameId, setGameId] = useState("");
const [gamePlayers, setGamePlayers] = useState<{ playerName: string; pts: number; pos: string }[]>([]);

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
}

const handleGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`/api/games/${gameId}`)
      .then((response) => response.json())
      .then((data) => setGamePlayers(data));
}

useEffect(() => {
  fetch("/api/players")
    .then((response) => response.json())
    .then((data) => setPlayers(data));
}, []);





const searchInput = players.filter((p) => p.playerName.toLowerCase().includes(searchquery.toLowerCase())).map((p) => ({ name: p.playerName, pts: p.pts}));


return ( 

    <div>
        <h2>Ball is Life</h2>
        <form onSubmit={handleSubmit}>
        <input
        type= "text"
        placeholder="enter NBA Players Name"
        value={searchquery}
        onChange={(event) => setSetSearchQuery(event.target.value)}
        />
        <button>
        Search
        </button>
    </form>
    {searchInput.length > 0 ? (
        <ul>
            {searchInput.map((item) => (
                <li key={item.name}>
                    {item.name}: {item.pts} pts
                </li>
            ))}
        </ul>
) : (
    <p> no players found</p>
    )}

    <h3>Game box score</h3>
    <form onSubmit={handleGameSubmit}>
        <input
        type="text"
        placeholder="enter game ID"
        value={gameId}
        onChange={(event) => setGameId(event.target.value)}
        />
        <button>Load</button>
    </form>
    <ul>
        {gamePlayers.map((p) => (
            <li key={p.playerName}>
                {p.playerName} ({p.pos}): {p.pts} pts
            </li>
        ))}
    </ul>
    </div>
);
}


export default FrontEnd