import React, { useState } from "react";
//import the nba endpoint
//import other things

function FrontEnd(){
const [searchquery, setSetSearchQuery] = useState("");
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
}

const players = [];

const searchInput = players.filter((p) => p.playerName.lowerCase().includes(searchquery.toLowerCase())).map((p) => ({ name: p.playerName, pts: p.pts}));


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
    </div>
);
}


export default FrontEnd