import { useMemo, useState } from "react";
import type { GameResult, PlayerProfile, Strategy } from "./domain/types";
import { defaultLineup, defaultStrategy, teams } from "./data/teams";
import { simulateGame } from "./simulation/simulateGame";
import { BottomNav, type MainView } from "./ui/components/BottomNav";
import { BoxScoreScreen } from "./ui/screens/BoxScoreScreen";
import { GamePlanScreen } from "./ui/screens/GamePlanScreen";
import { LineupScreen } from "./ui/screens/LineupScreen";
import { LiveGameScreen } from "./ui/screens/LiveGameScreen";
import { PregameScreen } from "./ui/screens/PregameScreen";
import { ProgramHome } from "./ui/screens/ProgramHome";
import { RosterScreen } from "./ui/screens/RosterScreen";

type View = MainView | "pregame" | "live" | "boxscore";

function App() {
  const [teamId, setTeamId] = useState(teams[0].id);
  const [lineup, setLineup] = useState<string[]>(() => defaultLineup(teams[0]));
  const [strategy, setStrategy] = useState<Strategy>({ ...defaultStrategy });
  const [seed, setSeed] = useState(20260730);
  const [view, setView] = useState<View>("home");
  const [selectedPlayerId, setSelectedPlayerId] = useState(teams[0].roster[0].id);
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const team = teams.find((candidate) => candidate.id === teamId) ?? teams[0];
  const opponent = teams[(teams.findIndex((candidate) => candidate.id === team.id) + 1) % teams.length];
  const opponentLineup = useMemo(() => defaultLineup(opponent), [opponent]);

  function navigateMain(nextView: MainView) {
    setError(null);
    setView(nextView);
  }

  function chooseTeam(nextId: string) {
    const nextTeam = teams.find((candidate) => candidate.id === nextId) ?? teams[0];
    setTeamId(nextTeam.id);
    setLineup(defaultLineup(nextTeam));
    setSelectedPlayerId(nextTeam.roster[0].id);
    setResult(null);
    setError(null);
    setView("home");
  }

  function toggleStarter(playerId: string) {
    setError(null);
    setResult(null);
    setLineup((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < 5 ? [...current, playerId] : current);
  }

  function updateStrategy(key: keyof Strategy, value: string | number | boolean) {
    setStrategy((current) => ({ ...current, [key]: value } as Strategy));
    setResult(null);
  }

  function resetLineup() {
    setLineup(defaultLineup(team));
    setResult(null);
    setError(null);
  }

  function simulate() {
    if (lineup.length !== 5) {
      setError("Lock exactly five starters before tip-off.");
      return;
    }
    try {
      const opponentStrategy: Strategy = { ...defaultStrategy, pace: strategy.pace === "very-fast" ? "fast" : "balanced", defensiveScheme: "man" };
      const game = simulateGame({ home: team, away: opponent, homeLineup: { playerIds: lineup }, awayLineup: { playerIds: opponentLineup }, homeStrategy: strategy, awayStrategy: opponentStrategy, seed });
      setResult(game);
      setError(null);
      setView("live");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The game could not be simulated.");
    }
  }

  const openPregame = () => { setError(null); setView("pregame"); };
  const activeMain = view === "pregame" || view === "live" || view === "boxscore" ? "home" : view;

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setView("home")}><span className="brand-dot" /> COURTSIDE</button><div className="topbar-right"><span className="season-pill">EXHIBITION · 2026</span><span className="avatar">HC</span></div></header>
    <main>{view === "home" && <><div className="program-switcher"><label><span>PROGRAM</span><select value={team.id} onChange={(event) => chooseTeam(event.target.value)}>{teams.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.nickname}</option>)}</select></label></div><ProgramHome team={team} opponent={opponent} result={result} onNavigate={navigateMain} onPregame={openPregame} /></>}
      {view === "roster" && <RosterScreen team={team} selectedPlayerId={selectedPlayerId} onSelect={(player: PlayerProfile) => setSelectedPlayerId(player.id)} />}
      {view === "lineup" && <LineupScreen team={team} lineup={lineup} strategy={strategy} onToggle={toggleStarter} onReset={resetLineup} onPregame={openPregame} />}
      {view === "gameplan" && <GamePlanScreen team={team} strategy={strategy} onUpdate={updateStrategy} onPregame={openPregame} />}
      {view === "pregame" && <PregameScreen team={team} opponent={opponent} lineup={lineup} strategy={strategy} seed={seed} error={error} onSeedChange={(nextSeed) => setSeed(nextSeed)} onBack={() => setView("home")} onSimulate={simulate} />}
      {view === "live" && result && <LiveGameScreen result={result} team={team} opponent={opponent} homeLineup={lineup} awayLineup={opponentLineup} onAdjustLineup={() => setView("lineup")} onAdjustPlan={() => setView("gameplan")} onBoxScore={() => setView("boxscore")} />}
      {view === "boxscore" && result && <BoxScoreScreen result={result} onBack={() => setView("live")} />}
      {error && view !== "pregame" && <p className="error-message">{error}</p>}
    </main>
    <BottomNav active={activeMain} onNavigate={navigateMain} />
    <footer><span>COURTSIDE ENGINE · v0.2</span><span>Seeded simulation · fictional programs</span></footer>
  </div>;
}

export default App;
