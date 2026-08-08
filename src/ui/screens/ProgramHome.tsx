import { CalendarDays, ClipboardList, Crosshair, Gauge, Home, ShieldCheck } from "lucide-react";
import type { GameResult, SeasonState, ScheduledGame, Team, UserCoach } from "../../domain/types";
import { getStandings } from "../../season/season";
import { PlayerPortrait } from "../components/Avatar";
import { TeamLogo } from "../components/TeamMark";
import type { MainView } from "../components/BottomNav";

function average(values: number[]): number { return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)); }
function paceLabel(style: string): string { return style.includes("Fast") ? "Fast pace" : style.includes("Defensive") ? "Slow pace" : "Balanced pace"; }

export function ProgramHome({ team, opponent, result, season, nextGame, gameInProgress = false, coach, onNavigate, onPregame }: { team: Team; opponent: Team; result: GameResult | null; season: SeasonState; nextGame?: ScheduledGame; gameInProgress?: boolean; coach?: UserCoach; onNavigate: (view: MainView) => void; onPregame: () => void }) {
  const record = season.records[team.id];
  const opponentRecord = season.records[opponent.id];
  const conferenceStanding = getStandings(season, team.conference).findIndex((entry) => entry.teamId === team.id) + 1;
  const starters = season.userLineup.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Team["roster"][number] => Boolean(player));
  const rotation = [...team.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, season.userStrategy.rotationSize);
  const offense = average(rotation.map((player) => (player.ratings.insideScoring + player.ratings.threePoint + player.ratings.passing) / 3));
  const defense = average(rotation.map((player) => (player.ratings.perimeterDefense + player.ratings.interiorDefense) / 2));
  const chemistryValue = average(starters.map((player) => (player.ratings.passing + player.ratings.basketballIQ) / 2));
  const opponentFive = [...opponent.roster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 5);
  const opponentInterior = average(opponentFive.map((player) => player.ratings.interiorDefense));
  const opponentThree = average(opponentFive.map((player) => player.ratings.threePoint));
  const recentGame = [...season.schedule].reverse().find((game) => game.status === "completed" && game.result && (game.homeTeamId === team.id || game.awayTeamId === team.id));
  const recentResult = recentGame?.result ?? result;
  const recentOpponent = recentGame ? season.teams.find((candidate) => candidate.id === (recentGame.homeTeamId === team.id ? recentGame.awayTeamId : recentGame.homeTeamId)) : recentResult ? (recentResult.home.team.id === team.id ? recentResult.away.team : recentResult.home.team) : undefined;
  const userBox = recentResult ? (recentResult.home.team.id === team.id ? recentResult.home : recentResult.away) : undefined;
  const opponentBox = recentResult ? (recentResult.home.team.id === team.id ? recentResult.away : recentResult.home) : undefined;
  const leaders = userBox ? {
    points: [...userBox.players].sort((a, b) => b.points - a.points)[0],
    rebounds: [...userBox.players].sort((a, b) => (b.offensiveRebounds + b.defensiveRebounds) - (a.offensiveRebounds + a.defensiveRebounds))[0],
    assists: [...userBox.players].sort((a, b) => b.assists - a.assists)[0],
  } : undefined;
  const leaderName = (playerId?: string) => team.roster.find((player) => player.id === playerId)?.name.split(" ").at(-1) ?? "—";
  const minutesLeader = team.roster.map((player) => ({ player, stats: season.playerStats[player.id] })).filter(({ stats }) => stats.gamesPlayed > 0).sort((a, b) => b.stats.minutes / b.stats.gamesPlayed - a.stats.minutes / a.stats.gamesPlayed)[0];
  const nextLocation = nextGame?.homeTeamId === team.id ? "Home" : "Away";

  return <div className="program-home">
    <section className="program-identity"><TeamLogo team={team} size="lg" /><div className="program-name"><span>{team.name.toUpperCase()}</span><h1>{team.nickname}</h1><p>Coach {coach ? `${coach.firstName} ${coach.lastName}` : team.coach.name}</p></div><div className="record-summary"><div><span>Conf Rank</span><b>#{conferenceStanding}</b></div><div><span>Record</span><b>{record.wins}–{record.losses}</b></div><div><span>Conf</span><b>{record.conferenceWins}–{record.conferenceLosses}</b></div></div></section>

    <section className="home-section next-matchup"><div className="home-section-title"><span><CalendarDays size={18} /> {gameInProgress ? "Game in progress" : "Next game"}</span><small>Day {nextGame?.day ?? season.currentDay} · 7:00 PM · <Home size={15} /> {nextLocation}</small></div>{nextGame ? <><div className="matchup-teams"><div><TeamLogo team={team} size="lg" /><span><b>{team.name}</b><strong>{team.nickname}</strong><small>{record.wins}–{record.losses}</small></span></div><i>{nextGame.homeTeamId === team.id ? "VS" : "AT"}</i><div><TeamLogo team={opponent} size="lg" /><span><b>{opponent.name}</b><strong>{opponent.nickname}</strong><small>{opponentRecord.wins}–{opponentRecord.losses}</small></span></div></div><div className="scouting-ribbon"><span><Gauge size={16} /> {paceLabel(opponent.coach.style)}</span><span><ShieldCheck size={16} /> {opponentInterior >= 72 ? "Strong interior defense" : "Attackable interior"}</span><span><Crosshair size={16} /> {opponentThree < 70 ? "Weak perimeter shooting" : "Perimeter threat"}</span></div><div className="matchup-actions"><button className="primary-action" onClick={onPregame}>{gameInProgress ? "Resume Game" : "Prepare for Game"}</button><button className="secondary-action" onClick={onPregame}>View Scouting</button></div></> : <div className="season-complete-inline"><b>Season complete</b><span>Final record {record.wins}–{record.losses} · #{conferenceStanding} in the {team.conference}</span></div>}</section>

    {recentResult && userBox && opponentBox && recentOpponent && <section className="home-section last-game"><div className="home-section-title"><span>Last game</span><small>{recentResult.winnerId === team.id ? "Won" : "Lost"} {userBox.stats.points}–{opponentBox.stats.points}</small></div><div className="last-score"><div><TeamLogo team={team} size="md" /><span>{team.shortName}</span><b>{userBox.stats.points}</b></div><div><TeamLogo team={recentOpponent} size="md" /><span>{recentOpponent.shortName}</span><b>{opponentBox.stats.points}</b></div><strong className={recentResult.winnerId === team.id ? "win" : "loss"}>{recentResult.winnerId === team.id ? "W" : "L"}</strong></div>{leaders && <p className="result-leaders">{leaderName(leaders.points.playerId)} {leaders.points.points} PTS <i>·</i> {leaderName(leaders.rebounds.playerId)} {leaders.rebounds.offensiveRebounds + leaders.rebounds.defensiveRebounds} REB <i>·</i> {leaderName(leaders.assists.playerId)} {leaders.assists.assists} AST</p>}</section>}

    <section className="home-section"><div className="home-section-title"><span>Starting five</span><button onClick={() => onNavigate("lineup")}>Edit rotation</button></div><div className="home-starters">{starters.map((player) => <button onClick={() => onNavigate("lineup")} key={player.id}><span className="jersey-number">{team.roster.findIndex((candidate) => candidate.id === player.id) + 1}</span><PlayerPortrait player={player} team={team} size={44} /><b>{player.name}</b><small>{player.position}</small><strong>{player.ratings.overall}</strong><i><em style={{ width: `${player.ratings.overall}%` }} /></i></button>)}</div></section>

    <section className="home-section team-snapshot"><div className="home-section-title"><span>Team snapshot</span></div><div><span>Offense<b>{offense}</b></span><span>Defense<b>{defense}</b></span><span>Pace<b>{season.userStrategy.pace.replace("very-", "Very ").replace(/^./, (letter) => letter.toUpperCase())}</b></span><span>Chemistry<b>{chemistryValue >= 78 ? "Excellent" : chemistryValue >= 70 ? "Good" : "Developing"}</b></span></div></section>

    <section className="rotation-note"><ClipboardList size={19} /><b>Rotation note</b><p>{minutesLeader && minutesLeader.stats.minutes / minutesLeader.stats.gamesPlayed >= 32 ? `${minutesLeader.player.name} is averaging ${(minutesLeader.stats.minutes / minutesLeader.stats.gamesPlayed).toFixed(1)} minutes per game.` : `Your current plan uses a ${season.userStrategy.rotationSize}-player rotation.`}</p></section>
  </div>;
}
