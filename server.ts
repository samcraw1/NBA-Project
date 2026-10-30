import express, { response } from "express"
import { NBAClient } from "nba-api-ts";

const app = express();
const nba = new NBAClient();

app.get("/api/players", async (request, response) => {
try {
      const { scoreboard } = await nba.live.scoreboard();
      const boxes = await Promise.all(scoreboard.games.map((g) => nba.live.boxscore(g.gameId)));
      const players = boxes.flatMap((b) => [...b.game.homeTeam.players, ...b.game.awayTeam.players]).map((p) => ({ playerId: p.personId, playerName: p.name, pts: p.statistics.points }));
      response.json(players);
    } catch (error) {
      response.status(502).json({ error: "could not reach NBA.com" });
    }
});


app.get("/api/games", async (request, response) => {
  try {
    const { scoreboard } = await nba.live.scoreboard();
    const games = scoreboard.games.map((g) => ({
      gameId: g.gameId,
      status: g.gameStatusText.trim(),
      away: { teamId: g.awayTeam.teamId, tricode: g.awayTeam.teamTricode, score: g.awayTeam.score },
      home: { teamId: g.homeTeam.teamId, tricode: g.homeTeam.teamTricode, score: g.homeTeam.score },
    }));
    response.json(games);
  } catch (error) {
    response.status(502).json({ error: "could not reach NBA.com" });
  }
});

app.get("/api/games/:gameId", async (request, response) => {
  try{

    const { gameId } = request.params;
    const box = await nba.live.boxscore(gameId);
    const players = [...box.game.homeTeam.players, ...box.game.awayTeam.players]
      .map((p) => ({ playerId: p.personId, playerName: p.name, pts: p.statistics.points, pos: p.position, played: p.played }));
    response.json(players);

  } catch (error){
    response.status(502).json({ error: "could not reach NBA.com" });
  }
})

app.get("/api/games/:gameId/plays", async (request, response) => {
  try{

    const { gameId } = request.params;
    const pbp = await nba.live.playByPlay(gameId);
    const plays = pbp.game.actions.map((a) => ({
      period: a.period,
      description: a.description,
      clock: a.clock,
      score: `${a.scoreAway} - ${a.scoreHome}`,
    }));
    response.json(plays);
  } catch(error){
    response.status(502).json({ error: "could not reach NBA.com" });
  }
});

app.get("/api/players/:playerId", async (request, response) => {
  try{
    const playerId = Number(request.params.playerId);
    const { scoreboard } = await nba.live.scoreboard();
    const boxes = await Promise.all(scoreboard.games.map((g) => nba.live.boxscore(g.gameId)));
    const player = boxes
      .flatMap((b) => [...b.game.homeTeam.players, ...b.game.awayTeam.players])
      .find((p) => p.personId === playerId);

    if (!player) {
      response.status(404).json({ error: "player not found" });
      return;
    }

    const s = player.statistics;
    response.json({
      playerId: player.personId,
      playerName: player.name,
      position: player.position,
      jerseyNum: player.jerseyNum,
      starter: player.starter,
      played: player.played,
      minutes: s.minutes,
      points: s.points,
      rebounds: s.reboundsTotal,
      assists: s.assists,
      steals: s.steals,
      blocks: s.blocks,
      turnovers: s.turnovers,
      fieldGoals: `${s.fieldGoalsMade}/${s.fieldGoalsAttempted}`,
      threePointers: `${s.threePointersMade}/${s.threePointersAttempted}`,
      freeThrows: `${s.freeThrowsMade}/${s.freeThrowsAttempted}`,
      plusMinus: s.plusMinusPoints,
    });
  } catch(error){
    response.status(502).json({ error: "could not reach NBA.com" });
  }
})

app.listen(3001);