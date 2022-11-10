const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDetailsObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

//API1-Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT *
        FROM player_details
    `;

  const playerArray = await db.all(getPlayersQuery);
  //response.send(playerArray);
  response.send(
    playerArray.map((eachPlayer) =>
      convertPlayerDetailsObjectToResponseObject(eachPlayer)
    )
  );
});

//API2-Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT *
        FROM player_details
        WHERE player_id = ${playerId};
    `;

  const playerArray = await db.get(getPlayerQuery);
  response.send(convertPlayerDetailsObjectToResponseObject(playerArray));
});

//API3 - Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;

  const updatePlayerQuery = `
        UPDATE player_details
        SET player_name = '${playerName}'
        WHERE player_id = ${playerId};
    `;

  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API4-Returns the match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;

  const getMatchDetailsQuery = `
        SELECT *
        FROM match_details
        WHERE match_id = ${matchId};
    `;

  const matchArray = await db.get(getMatchDetailsQuery);
  response.send(convertMatchDetailObjectToResponseObject(matchArray));
});

//API5-Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;

  const getAllMatchesQuery = `
        SELECT 
            match_details.match_id AS matchId,match,year
        FROM 
            match_details INNER JOIN player_match_score
             ON match_details.match_id = player_match_score.match_id
        WHERE player_id = ${playerId};
    `;
  const allMatchesArray = await db.all(getAllMatchesQuery);
  response.send(allMatchesArray);
});

//API6 - Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getSpecificPlayersQuery = `
        SELECT 
            player_details.player_id as playerId,
            player_details.player_name as playerName
        FROM (player_match_score INNER JOIN match_details ON
            player_match_score.match_id = match_details.match_id) AS T
            INNER JOIN player_details ON
            T.player_id = player_details.player_id;
        WHERE 
            match_id = ${matchId};
    `;
  const specificPlayersArray = await db.all(getSpecificPlayersQuery);
  response.send(specificPlayersArray);
});

//API7-Returns the statistics of the total score,
//fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;

  const getStatQuery = `
        SELECT 
            T.player_id AS playerId,
            player_details.player_name AS playerName,
            SUM (score) AS totalScore,
            SUM (fours) AS totalFours,
            SUM (sixes) AS totalSixes
        FROM (player_match_score INNER JOIN match_details ON
            player_match_score.match_id = match_details.match_id) AS T
            INNER JOIN player_details ON
            T.player_id = player_details.player_id;
        WHERE 
            player_id = ${playerId}; 
    `;

  const statQuery = await db.all(getStatQuery);
  response.send(statQuery);
});

module.exports = app;
