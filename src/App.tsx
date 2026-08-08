import { useState } from "react";
import type { CareerSave, GameResult, GameState, PlayerProfile, SeasonState, Strategy, UserCoach } from "./domain/types";
import { defaultLineup, teams } from "./data/teams";
import { acceptProgram, createCareer, settleCareerStage, startSeason } from "./career/career";
import { finalizeGame, initializeGame } from "./simulation/simulateGame";
import { advanceOneDay, advanceToNextUserGame, completeSeasonGame, getNextUserGame, teamStrategy } from "./season/season";
import { browserSaveRepository } from "./season/persistence";
import { BottomNav, type MainView } from "./ui/components/BottomNav";
import { CoachAvatar } from "./ui/components/Avatar";
import { BoxScoreScreen } from "./ui/screens/BoxScoreScreen";
import { CoachCreationScreen } from "./ui/screens/CoachCreationScreen";
import { EndSeasonScreen } from "./ui/screens/EndSeasonScreen";
import { GamePlanScreen } from "./ui/screens/GamePlanScreen";
import { LineupScreen } from "./ui/screens/LineupScreen";
import { LiveGameScreen } from "./ui/screens/LiveGameScreen";
import { PregameScreen } from "./ui/screens/PregameScreen";
import { ProgramHome } from "./ui/screens/ProgramHome";
import { ProgramSelectionScreen } from "./ui/screens/ProgramSelectionScreen";
import { RosterScreen } from "./ui/screens/RosterScreen";
import { SeasonIntroductionScreen } from "./ui/screens/SeasonIntroductionScreen";
import { SeasonHistoryScreen } from "./ui/screens/SeasonHistoryScreen";
import { SeasonScreen } from "./ui/screens/SeasonScreen";
import { SeasonStatsScreen } from "./ui/screens/SeasonStatsScreen";
import { StartScreen } from "./ui/screens/StartScreen";

type View = "start" | "coach-create" | "program-select" | "season-intro" | "end-season" | "history" | "stats" | MainView | "pregame" | "live" | "boxscore";

const saveRepository = browserSaveRepository(teams);
const initialLoad = saveRepository?.load() ?? { save: null };

function App() {
  const [career, setCareer] = useState<CareerSave | null>(initialLoad.save);
  const [loadError, setLoadError] = useState(initialLoad.error);
  const [view, setView] = useState<View>("start");
  const [selectedPlayerId, setSelectedPlayerId] = useState(teams[0].roster[0].id);
  const [boxResult, setBoxResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const season = career?.season;
  const team = teams.find((candidate) => candidate.id === career?.programId);
  const nextUserGame = season ? getNextUserGame(season) : undefined;
  const opponentId = team && nextUserGame ? (nextUserGame.homeTeamId === team.id ? nextUserGame.awayTeamId : nextUserGame.homeTeamId) : undefined;
  const opponent = teams.find((candidate) => candidate.id === opponentId);
  const lastResult = team && season ? [...season.schedule].reverse().find((game) => game.status === "completed" && game.result && (game.homeTeamId === team.id || game.awayTeamId === team.id))?.result : undefined;

  function store(next: CareerSave) {
    const updated = { ...next, updatedAt: Date.now() };
    setCareer(updated);
    saveRepository?.save(updated);
  }

  function continueCareer() {
    if (!career) return;
    setError(null);
    if (career.liveGame) setView("live");
    else if (career.stage === "program-selection") setView("program-select");
    else if (career.stage === "season-introduction") setView("season-intro");
    else if (career.stage === "season-complete") setView("end-season");
    else setView("home");
  }

  function deleteCareer() {
    saveRepository?.delete();
    setCareer(null); setLoadError(undefined); setBoxResult(null); setError(null); setView("start");
  }

  function createCoach(coach: UserCoach) {
    const next = createCareer(coach);
    store(next);
    setView("program-select");
  }

  function chooseProgram(teamId: string) {
    if (!career) return;
    const next = acceptProgram(career, teamId, teams);
    store(next);
    const selected = teams.find((candidate) => candidate.id === teamId)!;
    setSelectedPlayerId(selected.roster[0].id);
    setView("season-intro");
  }

  function beginSeason() {
    if (!career) return;
    store(startSeason(career));
    setView("home");
  }

  function updateSeason(nextSeason: SeasonState) {
    if (!career) return;
    store({ ...career, season: nextSeason, liveGame: undefined });
    setBoxResult(null);
  }

  function navigateMain(nextView: MainView) {
    setError(null);
    if (career?.liveGame?.state.status === "complete") store({ ...career, liveGame: undefined });
    setView(nextView);
  }

  function toggleStarter(playerId: string) {
    if (!career || !season || !team) return;
    const current = season.userLineup;
    const nextLineup = current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < 5 ? [...current, playerId] : current;
    updateSeason({ ...season, userLineup: nextLineup });
    setError(null);
  }

  function updateStrategy(key: keyof Strategy, value: string | number | boolean) {
    if (!season) return;
    updateSeason({ ...season, userStrategy: { ...season.userStrategy, [key]: value } as Strategy });
  }

  function resetLineup() {
    if (!season || !team) return;
    updateSeason({ ...season, userLineup: defaultLineup(team) });
    setError(null);
  }

  function prepareForGame() {
    if (!career || !season) return;
    if (career.liveGame?.state.status === "playing") { setView("live"); return; }
    if (!nextUserGame) { setView("end-season"); return; }
    const preparedSeason = advanceToNextUserGame(season);
    store({ ...career, season: preparedSeason, liveGame: undefined });
    setError(null); setView("pregame");
  }

  function tipOff() {
    if (!career || !season || !team || !opponent || !nextUserGame) return;
    if (season.userLineup.length !== 5) { setError("Lock exactly five starters before tip-off."); return; }
    try {
      const preparedSeason = advanceToNextUserGame(season);
      const scheduled = getNextUserGame(preparedSeason)!;
      const home = teams.find((candidate) => candidate.id === scheduled.homeTeamId)!;
      const away = teams.find((candidate) => candidate.id === scheduled.awayTeamId)!;
      const userIsHome = home.id === team.id;
      const opponentTeam = userIsHome ? away : home;
      const opponentStrategy = teamStrategy(opponentTeam);
      const running = initializeGame({ home, away, homeLineup: { playerIds: userIsHome ? preparedSeason.userLineup : defaultLineup(home) }, awayLineup: { playerIds: userIsHome ? defaultLineup(away) : preparedSeason.userLineup }, homeStrategy: userIsHome ? preparedSeason.userStrategy : opponentStrategy, awayStrategy: userIsHome ? opponentStrategy : preparedSeason.userStrategy, seed: scheduled.seed });
      store({ ...career, season: preparedSeason, liveGame: { gameId: scheduled.id, state: running } });
      setBoxResult(null); setError(null); setView("live");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The game could not be started."); }
  }

  function updateRunningGame(nextState: GameState) {
    if (!career || !season || !career.liveGame) return;
    if (nextState.status !== "complete") { store({ ...career, liveGame: { ...career.liveGame, state: nextState } }); return; }
    const result = finalizeGame(nextState);
    const completedSeason = completeSeasonGame(season, career.liveGame.gameId, result);
    const settled = settleCareerStage({ ...career, season: completedSeason, liveGame: undefined });
    store({ ...settled, liveGame: { gameId: career.liveGame.gameId, state: nextState } });
    setBoxResult(result);
  }

  function openBoxScore() {
    if (!career?.liveGame) return;
    const result = finalizeGame(career.liveGame.state);
    setBoxResult(result);
    store({ ...career, liveGame: undefined });
    setView("boxscore");
  }

  function finishBoxScore() { setView(career?.stage === "season-complete" ? "end-season" : "home"); }

  const careerShell = Boolean(career && season && team && ["home", "season", "roster", "lineup", "gameplan", "pregame", "live", "boxscore", "end-season", "history", "stats"].includes(view));
  const activeMain: MainView = view === "season" || view === "roster" || view === "lineup" || view === "gameplan" ? view : "home";

  if (view === "start") return <StartScreen hasSave={Boolean(career)} loadError={loadError} onNewCareer={() => { setLoadError(undefined); setView("coach-create"); }} onContinue={continueCareer} onDelete={deleteCareer} />;
  if (view === "coach-create") return <div className="onboarding-shell"><CoachCreationScreen onBack={() => setView("start")} onComplete={createCoach} /></div>;
  if (view === "program-select" && career) return <div className="onboarding-shell"><ProgramSelectionScreen coach={career.coach} teams={teams} onBack={() => setView("coach-create")} onAccept={chooseProgram} /></div>;
  if (view === "season-intro" && career && team) return <div className="onboarding-shell"><SeasonIntroductionScreen career={career} team={team} onBack={() => setView("program-select")} onStart={beginSeason} /></div>;
  if (!careerShell || !career || !season || !team) return <StartScreen hasSave={Boolean(career)} loadError={loadError} onNewCareer={() => setView("coach-create")} onContinue={continueCareer} onDelete={deleteCareer} />;

  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => navigateMain("home")}><span className="brand-dot" /> COURTSIDE</button><div className="topbar-right"><span className="season-pill">{season.seasonYear} SEASON · DAY {season.currentDay}</span><CoachAvatar coach={career.coach} team={team} size={30} /></div></header><main>
    {view === "home" && opponent && <ProgramHome team={team} opponent={opponent} result={lastResult ?? null} season={season} nextGame={nextUserGame} gameInProgress={career.liveGame?.state.status === "playing"} coach={career.coach} onNavigate={navigateMain} onPregame={prepareForGame} />}
    {view === "home" && !opponent && <EndSeasonScreen career={career} team={team} onViewSeason={() => setView("history")} onViewStats={() => setView("stats")} onMainMenu={() => setView("start")} />}
    {view === "season" && <SeasonScreen state={season} team={team} onAdvanceDay={() => updateSeason(advanceOneDay(season))} onAdvanceNextGame={() => updateSeason(advanceToNextUserGame(season))} onPlayNextGame={prepareForGame} />}
    {view === "roster" && <RosterScreen team={team} selectedPlayerId={selectedPlayerId} onSelect={(player: PlayerProfile) => setSelectedPlayerId(player.id)} />}
    {view === "lineup" && <LineupScreen team={team} lineup={season.userLineup} strategy={season.userStrategy} onToggle={toggleStarter} onReset={resetLineup} onPregame={prepareForGame} />}
    {view === "gameplan" && <GamePlanScreen team={team} strategy={season.userStrategy} onUpdate={updateStrategy} onPregame={prepareForGame} />}
    {view === "pregame" && opponent && nextUserGame && <PregameScreen team={team} opponent={opponent} lineup={season.userLineup} strategy={season.userStrategy} game={nextUserGame} teamRecord={season.records[team.id]} opponentRecord={season.records[opponent.id]} error={error} onBack={() => setView("home")} onSimulate={tipOff} />}
    {view === "live" && career.liveGame && <LiveGameScreen state={career.liveGame.state} userTeamId={team.id} game={season.schedule.find((scheduled) => scheduled.id === career.liveGame?.gameId)} onStateChange={updateRunningGame} onBoxScore={openBoxScore} />}
    {view === "boxscore" && boxResult && <BoxScoreScreen result={boxResult} onBack={finishBoxScore} backLabel={career.stage === "season-complete" ? "View season summary" : "Return to Program Home"} />}
    {view === "end-season" && <EndSeasonScreen career={career} team={team} onViewSeason={() => setView("history")} onViewStats={() => setView("stats")} onMainMenu={() => setView("start")} />}
    {view === "history" && <SeasonHistoryScreen state={season} team={team} onBack={() => setView(career.stage === "season-complete" ? "end-season" : "season")} />}
    {view === "stats" && <SeasonStatsScreen state={season} team={team} onBack={() => setView(career.stage === "season-complete" ? "end-season" : "season")} />}
    {error && view !== "pregame" && <p className="error-message">{error}</p>}
  </main><BottomNav active={activeMain} onNavigate={navigateMain} /><footer><span>COURTSIDE CAREER · v0.3</span><span>{career.coach.firstName} {career.coach.lastName} · {team.shortName}</span></footer></div>;
}

export default App;
