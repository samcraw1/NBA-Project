import { NBAClient } from 'nba-api-ts';

const nba = new NBAClient();
const scoreboard = await nba.live.scoreboard();

console.log(scoreboard.scoreboard.games);