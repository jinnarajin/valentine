import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Scene = "valentine" | "rpg";
type Pos = { x: number; y: number };
type Pointer = { x: number; y: number };

type Tile = "grass" | "road" | "water" | "town";
type Direction = "up" | "down" | "left" | "right";

type Player = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  gold: number;
  atk: number;
  def: number;
  potions: number;
};

type EnemyTemplate = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
};

type BattleState = {
  enemy: EnemyTemplate;
  enemyHp: number;
  logs: string[];
};

const WIDTH = 12;
const HEIGHT = 12;

const mapSeed: Tile[][] = Array.from({ length: HEIGHT }, (_, y) =>
  Array.from({ length: WIDTH }, (_, x) => {
    if ((x === 2 && y === 2) || (x === 9 && y === 9)) return "town";
    if (x === y || x + y === 11) return "road";
    if ((x === 0 && y > 7) || (x === 11 && y < 4) || (x === 4 && y === 8)) return "water";
    return "grass";
  }),
);

const enemies: EnemyTemplate[] = [
  { name: "슬라임", hp: 28, atk: 7, def: 2, xp: 12, gold: 8 },
  { name: "고블린", hp: 36, atk: 10, def: 3, xp: 18, gold: 14 },
  { name: "늑대", hp: 44, atk: 12, def: 4, xp: 23, gold: 18 },
  { name: "오크 전사", hp: 62, atk: 15, def: 6, xp: 34, gold: 26 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomEnemy(level: number): EnemyTemplate {
  const maxIndex = clamp(Math.floor(level / 2), 0, enemies.length - 1);
  const pick = enemies[Math.floor(Math.random() * (maxIndex + 1))];
  return {
    ...pick,
    hp: pick.hp + level * 3,
    atk: pick.atk + level,
    def: pick.def + Math.floor(level / 2),
  };
}

export default function App() {
  const [scene, setScene] = useState<Scene>("valentine");

  const boardRef = useRef<HTMLDivElement | null>(null);
  const yesBtnRef = useRef<HTMLButtonElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);
  const noPosRef = useRef<Pos>({ x: 0, y: 0 });
  const pointerRef = useRef<Pointer | null>(null);
  const rafRef = useRef<number | null>(null);

  const [yesClicks, setYesClicks] = useState(0);
  const [noPos, setNoPos] = useState<Pos>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const success = yesClicks >= 5;
  const yesScale = useMemo(() => Math.min(2.7, Number((1.15 ** yesClicks).toFixed(2))), [yesClicks]);

  const [player, setPlayer] = useState<Player>({
    x: 5,
    y: 5,
    hp: 100,
    maxHp: 100,
    mp: 35,
    maxMp: 35,
    level: 1,
    xp: 0,
    gold: 30,
    atk: 12,
    def: 5,
    potions: 3,
  });
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [message, setMessage] = useState("화살표/WASD 또는 아래 버튼으로 이동하세요.");
  const xpNeed = useMemo(() => player.level * 45, [player.level]);

  useEffect(() => {
    noPosRef.current = noPos;
  }, [noPos]);

  useEffect(() => {
    if (scene !== "valentine" || success) return;

    const board = boardRef.current;
    const yesBtn = yesBtnRef.current;
    const noBtn = noBtnRef.current;
    if (!board || !yesBtn || !noBtn) return;

    const placeOrClamp = () => {
      const boardRect = board.getBoundingClientRect();
      const yesRect = yesBtn.getBoundingClientRect();
      const noRect = noBtn.getBoundingClientRect();
      const padding = 12;
      const maxX = boardRect.width - noRect.width - padding;
      const maxY = boardRect.height - noRect.height - padding;

      if (!ready) {
        const startX = yesRect.right - boardRect.left + 18;
        const startY = yesRect.top - boardRect.top;
        const next = {
          x: clamp(startX, padding, maxX),
          y: clamp(startY, padding, maxY),
        };
        noPosRef.current = next;
        setNoPos(next);
        setReady(true);
        return;
      }

      const next = {
        x: clamp(noPosRef.current.x, padding, maxX),
        y: clamp(noPosRef.current.y, padding, maxY),
      };
      noPosRef.current = next;
      setNoPos(next);
    };

    placeOrClamp();
    window.addEventListener("resize", placeOrClamp);
    return () => window.removeEventListener("resize", placeOrClamp);
  }, [ready, scene, success]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const runEscape = () => {
    rafRef.current = null;
    if (!pointerRef.current || !ready || success || scene !== "valentine") return;

    const board = boardRef.current;
    const noBtn = noBtnRef.current;
    if (!board || !noBtn) return;

    const boardRect = board.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();
    const { x: clientX, y: clientY } = pointerRef.current;

    const px = clientX - boardRect.left;
    const py = clientY - boardRect.top;
    const current = noPosRef.current;
    const cx = current.x + noRect.width / 2;
    const cy = current.y + noRect.height / 2;
    if (Math.hypot(px - cx, py - cy) > 120) return;

    const padding = 12;
    const maxX = boardRect.width - noRect.width - padding;
    const maxY = boardRect.height - noRect.height - padding;

    const awayX = cx - px;
    const awayY = cy - py;
    const len = Math.hypot(awayX, awayY) || 1;
    const ux = awayX / len;
    const uy = awayY / len;

    const nx = clamp(current.x + ux * rand(120, 230) + rand(-36, 36), padding, maxX);
    const ny = clamp(current.y + uy * rand(120, 230) + rand(-36, 36), padding, maxY);

    const fallbackX = rand(padding, maxX);
    const fallbackY = rand(padding, maxY);
    const next = Math.hypot(fallbackX - px, fallbackY - py) > 130 ? { x: fallbackX, y: fallbackY } : { x: nx, y: ny };

    noPosRef.current = next;
    setNoPos(next);
  };

  const scheduleEscape = (clientX: number, clientY: number) => {
    pointerRef.current = { x: clientX, y: clientY };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(runEscape);
  };

  const canMoveTo = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return false;
    return mapSeed[y][x] !== "water";
  };

  const startBattle = () => {
    const enemy = randomEnemy(player.level);
    setBattle({ enemy, enemyHp: enemy.hp, logs: [`야생의 ${enemy.name} 등장!`] });
    setMessage(`${enemy.name}와 전투가 시작됐다.`);
  };

  const gainRewards = (xpGain: number, goldGain: number) => {
    setPlayer((prev) => {
      let next = { ...prev, xp: prev.xp + xpGain, gold: prev.gold + goldGain };
      while (next.xp >= next.level * 45) {
        next = {
          ...next,
          xp: next.xp - next.level * 45,
          level: next.level + 1,
          maxHp: next.maxHp + 16,
          maxMp: next.maxMp + 6,
          hp: next.maxHp + 16,
          mp: next.maxMp + 6,
          atk: next.atk + 4,
          def: next.def + 2,
        };
        setMessage(`레벨 업! Lv.${next.level}`);
      }
      return next;
    });
  };

  const move = (direction: Direction) => {
    if (scene !== "rpg" || battle) return;

    const delta =
      direction === "up"
        ? [0, -1]
        : direction === "down"
          ? [0, 1]
          : direction === "left"
            ? [-1, 0]
            : [1, 0];

    setPlayer((prev) => {
      const nx = prev.x + delta[0];
      const ny = prev.y + delta[1];
      if (!canMoveTo(nx, ny)) {
        setMessage("그 방향으로는 이동할 수 없다.");
        return prev;
      }

      const tile = mapSeed[ny][nx];
      if (tile === "town") {
        const heal = Math.min(prev.maxHp - prev.hp, 28);
        const mana = Math.min(prev.maxMp - prev.mp, 12);
        setMessage("마을에서 휴식했다. 체력과 마나가 회복된다.");
        return { ...prev, x: nx, y: ny, hp: prev.hp + heal, mp: prev.mp + mana };
      }

      if (tile === "grass" && Math.random() < 0.28) {
        window.setTimeout(startBattle, 80);
      } else {
        setMessage("탐험 중...");
      }

      return { ...prev, x: nx, y: ny };
    });
  };

  const applyEnemyTurn = (enemyAtk: number, enemyName: string, logs: string[]) => {
    let died = false;
    setPlayer((prev) => {
      const damage = Math.max(3, enemyAtk - prev.def + Math.floor(Math.random() * 4));
      const nextHp = Math.max(0, prev.hp - damage);
      logs.push(`${enemyName}의 반격! ${damage} 피해`);
      if (nextHp <= 0) died = true;
      return { ...prev, hp: nextHp };
    });
    return died;
  };

  const doAction = (action: "attack" | "skill" | "potion" | "run") => {
    if (!battle || scene !== "rpg") return;

    if (action === "run") {
      const escaped = Math.random() > 0.4;
      if (escaped) {
        setBattle(null);
        setMessage("도망에 성공했다.");
      } else {
        const logs = ["도망 실패!"];
        const died = applyEnemyTurn(battle.enemy.atk, battle.enemy.name, logs);
        setBattle((prev) => (prev ? { ...prev, logs: [...prev.logs, ...logs] } : prev));
        if (died) setMessage("쓰러졌다... 마을에서 부활한다.");
      }
      return;
    }

    if (action === "potion") {
      if (player.potions <= 0) {
        setBattle((prev) => (prev ? { ...prev, logs: [...prev.logs, "포션이 없다!"] } : prev));
        return;
      }
      const logs = ["포션 사용! HP +35"];
      setPlayer((prev) => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + 35),
        potions: prev.potions - 1,
      }));
      const died = applyEnemyTurn(battle.enemy.atk, battle.enemy.name, logs);
      setBattle((prev) => (prev ? { ...prev, logs: [...prev.logs, ...logs] } : prev));
      if (died) setMessage("쓰러졌다... 마을에서 부활한다.");
      return;
    }

    const isSkill = action === "skill";
    if (isSkill && player.mp < 10) {
      setBattle((prev) => (prev ? { ...prev, logs: [...prev.logs, "마나가 부족하다!"] } : prev));
      return;
    }

    const logs: string[] = [];
    let nextEnemyHp = battle.enemyHp;
    const damage = isSkill
      ? Math.max(10, player.atk * 2 - battle.enemy.def + Math.floor(Math.random() * 8))
      : Math.max(5, player.atk - battle.enemy.def + Math.floor(Math.random() * 6));

    nextEnemyHp = Math.max(0, nextEnemyHp - damage);
    logs.push(`${isSkill ? "파이어 슬래시" : "기본 공격"}! ${damage} 피해`);

    if (isSkill) {
      setPlayer((prev) => ({ ...prev, mp: prev.mp - 10 }));
    }

    if (nextEnemyHp <= 0) {
      logs.push(`${battle.enemy.name} 처치! +${battle.enemy.xp}XP, +${battle.enemy.gold}G`);
      gainRewards(battle.enemy.xp, battle.enemy.gold);
      setBattle((prev) => (prev ? { ...prev, enemyHp: 0, logs: [...prev.logs, ...logs] } : prev));
      window.setTimeout(() => setBattle(null), 350);
      setMessage(`${battle.enemy.name}를 쓰러뜨렸다.`);
      return;
    }

    const died = applyEnemyTurn(battle.enemy.atk, battle.enemy.name, logs);
    setBattle((prev) => (prev ? { ...prev, enemyHp: nextEnemyHp, logs: [...prev.logs, ...logs] } : prev));

    if (died) {
      setBattle(null);
      setPlayer((prev) => ({ ...prev, x: 2, y: 2, hp: prev.maxHp, mp: prev.maxMp }));
      setMessage("전투에서 패배했다. 마을로 돌아왔다.");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (scene !== "rpg") return;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") move("up");
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") move("down");
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") move("left");
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") move("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (scene === "rpg") {
    return (
      <main className="rpg-page">
        <div className="top-actions">
          <button className="switch-btn" onClick={() => setScene("valentine")}>발렌타인 화면으로</button>
        </div>
        <h1 className="game-title">핑크던전 RPG</h1>
        <p className="game-sub">싱글플레이 웹 RPG 프로토타입</p>

        <section className="layout">
          <article className="panel map-panel">
            <div className="map-grid" role="img" aria-label="RPG 맵">
              {mapSeed.map((row, y) =>
                row.map((tile, x) => {
                  const isPlayer = player.x === x && player.y === y;
                  return (
                    <div key={`${x}-${y}`} className={`tile ${tile}`}>
                      {isPlayer ? <span className="avatar">🧝</span> : null}
                      {!isPlayer && tile === "town" ? <span className="icon">🏠</span> : null}
                      {!isPlayer && tile === "water" ? <span className="icon">🌊</span> : null}
                    </div>
                  );
                }),
              )}
            </div>
            <p className="message">{message}</p>
            <div className="pad">
              <button onClick={() => move("up")} aria-label="위로 이동">↑</button>
              <div>
                <button onClick={() => move("left")} aria-label="왼쪽 이동">←</button>
                <button onClick={() => move("down")} aria-label="아래로 이동">↓</button>
                <button onClick={() => move("right")} aria-label="오른쪽 이동">→</button>
              </div>
            </div>
          </article>

          <article className="panel stat-panel">
            <h2>플레이어</h2>
            <ul className="stat-list">
              <li>레벨: {player.level}</li>
              <li>HP: {player.hp}/{player.maxHp}</li>
              <li>MP: {player.mp}/{player.maxMp}</li>
              <li>XP: {player.xp}/{xpNeed}</li>
              <li>공격력: {player.atk}</li>
              <li>방어력: {player.def}</li>
              <li>골드: {player.gold}G</li>
              <li>포션: {player.potions}개</li>
            </ul>

            <div className="legend">
              <p>지형</p>
              <span>초원: 랜덤 전투</span>
              <span>마을: HP/MP 회복</span>
              <span>물: 이동 불가</span>
            </div>

            {battle ? (
              <div className="battle">
                <h3>전투: {battle.enemy.name}</h3>
                <p>적 HP: {battle.enemyHp}/{battle.enemy.hp}</p>
                <div className="actions">
                  <button onClick={() => doAction("attack")}>공격</button>
                  <button onClick={() => doAction("skill")}>스킬(10 MP)</button>
                  <button onClick={() => doAction("potion")}>포션</button>
                  <button onClick={() => doAction("run")}>도망</button>
                </div>
                <div className="logs" aria-live="polite">
                  {battle.logs.slice(-6).map((log, idx) => (
                    <p key={`${log}-${idx}`}>{log}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="battle idle">전투 없음</div>
            )}
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section
        className={`card ${success ? "success" : ""}`}
        onMouseMove={(e) => scheduleEscape(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) scheduleEscape(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) scheduleEscape(t.clientX, t.clientY);
        }}
      >
        <div className="sparkle" aria-hidden="true" />

        {!success ? (
          <>
            <h1 className="title">내 발렌타인이 돼줄래? <br/> 💘</h1>
            <p className="guide" aria-live="polite">예를 5번 누르면 성공! ({yesClicks}/5)</p>

            <div className="button-board" ref={boardRef}>
              <button
                ref={yesBtnRef}
                className="btn yes"
                onClick={() => setYesClicks((prev) => prev + 1)}
                style={{ transform: `scale(${yesScale})` } as CSSProperties}
                aria-label="예 버튼"
              >
                예 💖
              </button>

              <button
                ref={noBtnRef}
                className="btn no"
                style={{
                  left: `${noPos.x}px`,
                  top: `${noPos.y}px`,
                  opacity: ready ? 1 : 0,
                }}
                onMouseEnter={(e) => scheduleEscape(e.clientX, e.clientY)}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (t) scheduleEscape(t.clientX, t.clientY);
                }}
                aria-label="아니요 버튼"
              >
                아니요 🙅‍♂️
              </button>
            </div>
          </>
        ) : (
          <div className="success-wrap">
            <h1 className="title done">💞 데이트때 봐!</h1>
            <p className="guide done-sub">약속 완료! 사랑 가득한 하루 보내자.</p>
            <div className="heart-layer" aria-hidden="true">
              {Array.from({ length: 14 }, (_, idx) => (
                <span
                  key={idx}
                  className="heart"
                  style={
                    {
                      left: `${8 + idx * 6}%`,
                      animationDelay: `${(idx % 6) * 0.35}s`,
                      animationDuration: `${3 + (idx % 4) * 0.5}s`,
                      fontSize: `${18 + (idx % 5) * 6}px`,
                    } as CSSProperties
                  }
                >
                  💗
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rpg-entry">
          <button className="switch-btn" onClick={() => setScene("rpg")} aria-label="RPG 화면으로 이동">
            RPG 시작하기
          </button>
        </div>
      </section>
    </main>
  );
}
