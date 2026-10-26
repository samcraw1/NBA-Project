import React, { useState } from "react";
//import the nba endpoint
//import other things

function FrontEnd(){
const [searchquery, setSetSearchQuery] = useState("");

const players = [];

const searchInput = players.filter((p) => p.playerName.lowerCase().includes(searchquery.toLowerCase())).map((p) => ({ name: p.playerName, pts: p.pts}));


return ( 

    <div>
        <h2>Ball is Life</h2>
        <input
        type= "text"
        placeholder="enter NBA Players Name"
        value={searchquery}
        onChange={(event) => setSetSearchQuery(event.target.value)}
        />
    </div>

) 

}


export default FrontEnd