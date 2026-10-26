import express from "express"
import { NBAClient } from "nba-api-ts";

const app = express();
const nba = new NBAClient();

app.get("/api/players", async (request, response) => {
    const { scoreboard } = await nba.live.scoreboard();
    const boxes = await Promise.all(scoreboard.games.map((g) => nba.live.boxscore(g.gameId)));
    const players = boxes.flatMap((b) => [...b.game.homeTeam.players, ...b.game.awayTeam.players]).map((p) => ({ playerName: p.name, pts: p.statistics.points }));
  response.json(players);
})

app.listen(3001);