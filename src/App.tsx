import { useCallback, useEffect, useState } from "react";
import { Stage } from "./components/Stage";
import { TitleScreen } from "./components/TitleScreen";
import { OperationSelect } from "./components/OperationSelect";
import { RobotSelect } from "./components/RobotSelect";
import { LevelSelect } from "./components/LevelSelect";
import { Battle, type BattleResult } from "./components/Battle";
import { AdminScreen } from "./components/AdminScreen";
import { type MathOp } from "./game/levels";
import { levelsForOp } from "./game/storage";
import { ROBOTS, getRobot, type RobotId } from "./game/robots";
import { preloadKeyed } from "./game/chroma";
import { isMuted, setMuted, unlockAudio } from "./game/audio";
import {
  clearProgress,
  defaultProgress,
  loadProgress,
  saveProgress,
  type Progress,
} from "./game/storage";
import { loadBank, saveBank, type QuizBank } from "./game/quizBank";

type Screen = "title" | "op" | "select" | "levels" | "battle" | "admin";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [op, setOp] = useState<MathOp>("÷");
  const [players, setPlayers] = useState<1 | 2>(1);
  const [robots, setRobots] = useState<[RobotId, RobotId]>(["yellow", "blue"]);
  const [levelId, setLevelId] = useState(1);
  const [battleKey, setBattleKey] = useState(0);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [bank, setBank] = useState<QuizBank>(() => loadBank());

  const levels = levelsForOp(op);

  // Siapkan gambar robot (hapus latar) sejak awal
  useEffect(() => {
    preloadKeyed(ROBOTS.map((r) => r.image));
  }, []);

  // Aktifkan audio pada interaksi pertama
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
  }, []);

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const updateBank = useCallback((b: QuizBank) => {
    setBank(b);
    saveBank(b);
  }, []);

  const handleFinished = useCallback(
    (r: BattleResult) => {
      updateProgress((p) => {
        const list = levelsForOp(r.op);
        const idx = Math.min(r.levelId - 1, list.length - 1);
        const won = r.players === 1 ? r.winner === 0 : r.winner !== null;
        const stars = (
          r.op === "+"
            ? p.addStars
            : r.op === "×"
              ? p.mulStars
              : r.op === "−"
                ? p.subStars
                : p.divStars
        ).slice();
        if (r.players === 1) stars[idx] = Math.max(stars[idx] ?? 0, r.stars);
        const next: Progress = {
          ...p,
          coins: p.coins + r.coins,
          bestScore: Math.max(p.bestScore, r.score),
          wins: p.wins + (won ? 1 : 0),
        };
        if (r.op === "+") {
          next.addStars = stars;
          if (won) next.addUnlocked = Math.max(next.addUnlocked, Math.min(list.length, r.levelId + 1));
        } else if (r.op === "×") {
          next.mulStars = stars;
          if (won) next.mulUnlocked = Math.max(next.mulUnlocked, Math.min(list.length, r.levelId + 1));
        } else if (r.op === "−") {
          next.subStars = stars;
          if (won) next.subUnlocked = Math.max(next.subUnlocked, Math.min(list.length, r.levelId + 1));
        } else {
          next.divStars = stars;
          if (won) next.divUnlocked = Math.max(next.divUnlocked, Math.min(list.length, r.levelId + 1));
        }
        return next;
      });
    },
    [updateProgress]
  );

  const level = levels.find((l) => l.id === levelId) ?? levels[0];

  return (
    <Stage>
      {screen === "title" && (
        <TitleScreen
          progress={progress}
          muted={muted}
          onToggleMute={toggleMute}
          onStart={(n) => {
            setPlayers(n);
            setScreen("op");
          }}
          onOpenAdmin={() => setScreen("admin")}
        />
      )}
      {screen === "op" && (
        <OperationSelect
          progress={progress}
          onBack={() => setScreen("title")}
          onPick={(o) => {
            setOp(o);
            setLevelId(1);
            setScreen("select");
          }}
        />
      )}
      {screen === "select" && (
        <RobotSelect
          players={players}
          onBack={() => setScreen("op")}
          onConfirm={(r) => {
            setRobots(r);
            setScreen("levels");
          }}
        />
      )}
      {screen === "levels" && (
        <LevelSelect
          op={op}
          progress={progress}
          players={players}
          robots={robots}
          bank={bank}
          onBack={() => setScreen("select")}
          onPick={(id) => {
            setLevelId(id);
            setBattleKey((k) => k + 1);
            setScreen("battle");
          }}
          onReset={() => {
            clearProgress();
            setProgress(defaultProgress());
          }}
        />
      )}
      {screen === "battle" && (
        <Battle
          key={`${battleKey}-${levelId}-${op}`}
          players={players}
          robots={[getRobot(robots[0]), getRobot(robots[1])]}
          level={level}
          bank={bank}
          hasNext={levelId < levels.length}
          muted={muted}
          onToggleMute={toggleMute}
          onExit={() => setScreen("title")}
          onLevels={() => setScreen("levels")}
          onRetry={() => setBattleKey((k) => k + 1)}
          onNext={() => {
            setLevelId((id) => Math.min(levels.length, id + 1));
            setBattleKey((k) => k + 1);
          }}
          onFinished={handleFinished}
        />
      )}
      {screen === "admin" && (
        <AdminScreen
          op={op}
          bank={bank}
          onChange={updateBank}
          onOpChange={(o) => setOp(o)}
          onBack={() => setScreen("title")}
        />
      )}
    </Stage>
  );
}
