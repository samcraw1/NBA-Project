import express from "express"
import { NBAClient } from "nba-api-ts";

const app = express();
const nba = new NBAClient();

app.get("/api/players", async (request, response) => {
try {
      const { scoreboard } = await nba.live.scoreboard();
      const boxes = await Promise.all(scoreboard.games.map((g) => nba.live.boxscore(g.gameId)));
      const players = boxes.flatMap((b) => [...b.game.homeTeam.players, ...b.game.awayTeam.players]).map((p) => ({ playerName: p.name, pts: p.statistics.points }));
      response.json(players);
    } catch (error) {
      response.status(502).json({ error: "could not reach NBA.com" });
    }
});


app.get("/api/games/:gameId", async (request, response) => {
  try{

    const { gameId } = request.params;
    const box = await nba.live.boxscore(gameId);
    const players = [...box.game.homeTeam.players, ...box.game.awayTeam.players]
      .map((p) => ({ playerName: p.name, pts: p.statistics.points, pos: p.position, played: p.played }));
    response.json(players);

  } catch (error){
    response.status(502).json({ error: "could not reach NBA.com" });
  }
})

app.get("/api/games/:gameId/plays", async (request, response) => {
  try{

    const { gameId } = request.params;
    const box = await nba.live.boxscore(gameId);
    const pbp = await nba.live.playByPlay(gameId);
    const plays = pbp.game.actions.map((a) => ({ 
      period: a.period,
      description: a.descripton,
      clock: a.clock,
      score: `${a.scoreAway} - ${a.scoreHome}`,
    }));
    response.json(plays);
  } catch(error){
    response.status(502).json({ error: "could not reach NBA.com" });
  }
});

app.listen(3001);