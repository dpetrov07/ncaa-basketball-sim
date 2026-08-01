import { useState } from "react";
import type { GameResult, PlayerProfile, SeasonState, Strategy } from "./domain/types";
import { defaultLineup, teams } from "./data/teams";
import { simulateGame } from "./simulation/simulateGame";
import { completeSeasonGame, createSeasonState, advanceOneDay, advanceToNextUserGame, getNextUserGame, teamStrategy } from "./season/season";
import { loadSeason, saveSeason } from "./season/persistence";
import { BottomNav, type MainView } from "./ui/components/BottomNav";
import { BoxScoreScreen } from "./ui/screens/BoxScoreScreen";
import { GamePlanScreen } from "./ui/screens/GamePlanScreen";
import { LineupScreen } from "./ui/screens/LineupScreen";
import { LiveGameScreen } from "./ui/screens/LiveGameScreen";
import { PregameScreen } from "./ui/screens/PregameScreen";
import { ProgramHome } from "./ui/screens/ProgramHome";
import { RosterScreen } from "./ui/screens/RosterScreen";
import { SeasonScreen } from "./ui/screens/SeasonScreen";

type View = MainView | "pregame" | "live" | "boxscore";

function App() {
  const [season, setSeason] = useState<SeasonState>(() => loadSeason() ?? createSeasonState(teams, teams[0].id));
  const [teamId, setTeamId] = useState(season.userTeamId);
  const [lineup, setLineup] = useState<string[]>(() => season.userLineup);
  const [strategy, setStrategy] = useState<Strategy>(() => ({ ...season.userStrategy }));
  const [seed, setSeed] = useState(20260730);
  const [view, setView] = useState<View>("home");
  const [selectedPlayerId, setSelectedPlayerId] = useState(season.teams[0].roster[0].id);
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const team = season.teams.find((candidate) => candidate.id === teamId) ?? season.teams[0];
  const nextUserGame = getNextUserGame(season);
  const opponentId = nextUserGame ? (nextUserGame.homeTeamId === team.id ? nextUserGame.awayTeamId : nextUserGame.homeTeamId) : season.teams.find((candidate) => candidate.id !== team.id)?.id;
  const opponent = season.teams.find((candidate) => candidate.id === opponentId) ?? season.teams[1];
  const lastResult = [...season.schedule].reverse().find((game) => game.status === "completed" && game.result)?.result ?? result;

  function navigateMain(nextView: MainView) {
    setError(null);
    setView(nextView);
  }

  function chooseTeam(nextId: string) {
    const nextTeam = season.teams.find((candidate) => candidate.id === nextId) ?? season.teams[0];
    const newSeason = createSeasonState(season.teams, nextTeam.id, season.seed);
    setTeamId(nextTeam.id);
    setLineup(defaultLineup(nextTeam));
    setSelectedPlayerId(nextTeam.roster[0].id);
    setSeason(newSeason); saveSeason(newSeason);
    setResult(null);
    setError(null);
    setView("home");
  }

  function toggleStarter(playerId: string) {
    setError(null);
    setResult(null);
    setLineup((current) => {
      const nextLineup = current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < 5 ? [...current, playerId] : current;
      setSeason((currentSeason) => { const nextSeason = { ...currentSeason, userLineup: nextLineup }; saveSeason(nextSeason); return nextSeason; });
      return nextLineup;
    });
  }

  function updateStrategy(key: keyof Strategy, value: string | number | boolean) {
    setStrategy((current) => {
      const nextStrategy = { ...current, [key]: value } as Strategy;
      setSeason((currentSeason) => { const nextSeason = { ...currentSeason, userStrategy: nextStrategy }; saveSeason(nextSeason); return nextSeason; });
      return nextStrategy;
    });
    setResult(null);
  }

  function resetLineup() {
    const nextLineup = defaultLineup(team);
    setLineup(nextLineup);
    setSeason((currentSeason) => { const nextSeason = { ...currentSeason, userLineup: nextLineup }; saveSeason(nextSeason); return nextSeason; });
    setResult(null);
    setError(null);
  }

  function replaceSeason(nextSeason: SeasonState) {
    setSeason(nextSeason); saveSeason(nextSeason); setTeamId(nextSeason.userTeamId); setLineup(nextSeason.userLineup); setStrategy({ ...nextSeason.userStrategy }); setResult(null);
  }

  function simulate() {
    if (lineup.length !== 5) {
      setError("Lock exactly five starters before tip-off.");
      return;
    }
    if (!nextUserGame) { setError("There are no scheduled games remaining this season."); return; }
    try {
      const home = season.teams.find((candidate) => candidate.id === nextUserGame.homeTeamId)!;
      const away = season.teams.find((candidate) => candidate.id === nextUserGame.awayTeamId)!;
      const userIsHome = home.id === team.id;
      const opponentStrategy: Strategy = teamStrategy(opponent);
      const game = simulateGame({ home, away, homeLineup: { playerIds: userIsHome ? lineup : defaultLineup(home) }, awayLineup: { playerIds: userIsHome ? defaultLineup(away) : lineup }, homeStrategy: userIsHome ? strategy : opponentStrategy, awayStrategy: userIsHome ? opponentStrategy : strategy, seed: nextUserGame.seed });
      const completedSeason = completeSeasonGame(season, nextUserGame.id, game);
      setSeason(completedSeason); saveSeason(completedSeason);
      setResult(game);
      setError(null);
      setView("live");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The game could not be simulated.");
    }
  }

  const openPregame = () => { if (!nextUserGame) { setError("There are no scheduled games remaining this season."); return; } setError(null); setView("pregame"); };
  const activeMain = view === "pregame" || view === "live" || view === "boxscore" ? "home" : view;

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setView("home")}><span className="brand-dot" /> COURTSIDE</button><div className="topbar-right"><span className="season-pill">EXHIBITION · 2026</span><span className="avatar">HC</span></div></header>
    <main>{view === "home" && <><div className="program-switcher"><label><span>PROGRAM</span><select value={team.id} onChange={(event) => chooseTeam(event.target.value)}>{season.teams.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.nickname}</option>)}</select></label></div><ProgramHome team={team} opponent={opponent} result={lastResult} onNavigate={navigateMain} onPregame={openPregame} /></>}
      {view === "season" && <SeasonScreen state={season} team={team} onAdvanceDay={() => replaceSeason(advanceOneDay(season))} onAdvanceNextGame={() => replaceSeason(advanceToNextUserGame(season))} onPlayNextGame={openPregame} onNewSave={() => { const fresh = createSeasonState(season.teams, season.userTeamId, season.seed + 1); replaceSeason(fresh); setView("home"); }} />}
      {view === "roster" && <RosterScreen team={team} selectedPlayerId={selectedPlayerId} onSelect={(player: PlayerProfile) => setSelectedPlayerId(player.id)} />}
      {view === "lineup" && <LineupScreen team={team} lineup={lineup} strategy={strategy} onToggle={toggleStarter} onReset={resetLineup} onPregame={openPregame} />}
      {view === "gameplan" && <GamePlanScreen team={team} strategy={strategy} onUpdate={updateStrategy} onPregame={openPregame} />}
      {view === "pregame" && <PregameScreen team={team} opponent={opponent} lineup={lineup} strategy={strategy} seed={seed} error={error} onSeedChange={(nextSeed) => setSeed(nextSeed)} onBack={() => setView("home")} onSimulate={simulate} />}
      {view === "live" && result && <LiveGameScreen result={result} team={result.home.team} opponent={result.away.team} homeLineup={result.home.team.id === team.id ? lineup : defaultLineup(result.home.team)} awayLineup={result.away.team.id === team.id ? lineup : defaultLineup(result.away.team)} onAdjustLineup={() => setView("lineup")} onAdjustPlan={() => setView("gameplan")} onBoxScore={() => setView("boxscore")} />}
      {view === "boxscore" && result && <BoxScoreScreen result={result} onBack={() => setView("live")} />}
      {error && view !== "pregame" && <p className="error-message">{error}</p>}
    </main>
    <BottomNav active={activeMain} onNavigate={navigateMain} />
    <footer><span>COURTSIDE ENGINE · v0.2</span><span>Seeded simulation · fictional programs</span></footer>
  </div>;
}

export default App;
