import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Pos = { x: number; y: number };
type Pointer = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function App() {
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

  useEffect(() => {
    noPosRef.current = noPos;
  }, [noPos]);

  useEffect(() => {
    if (success) return;

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
  }, [ready, success]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const runEscape = () => {
    rafRef.current = null;
    if (!pointerRef.current || !ready || success) return;

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
    const triggerRadius = 120;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist > triggerRadius) return;

    const padding = 12;
    const maxX = boardRect.width - noRect.width - padding;
    const maxY = boardRect.height - noRect.height - padding;

    const awayX = cx - px;
    const awayY = cy - py;
    const len = Math.hypot(awayX, awayY) || 1;
    const ux = awayX / len;
    const uy = awayY / len;

    const step = rand(120, 230);
    let nx = current.x + ux * step + rand(-36, 36);
    let ny = current.y + uy * step + rand(-36, 36);
    nx = clamp(nx, padding, maxX);
    ny = clamp(ny, padding, maxY);

    const fallbackX = rand(padding, maxX);
    const fallbackY = rand(padding, maxY);
    const fallbackDist = Math.hypot(fallbackX - px, fallbackY - py);
    const next = fallbackDist > 130 ? { x: fallbackX, y: fallbackY } : { x: nx, y: ny };

    noPosRef.current = next;
    setNoPos(next);
  };

  const scheduleEscape = (clientX: number, clientY: number) => {
    pointerRef.current = { x: clientX, y: clientY };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(runEscape);
  };

  const handleYesClick = () => {
    if (!success) {
      setYesClicks((prev) => prev + 1);
    }
  };

  const hearts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, idx) => ({
        id: idx,
        left: `${8 + idx * 6}%`,
        delay: `${(idx % 6) * 0.35}s`,
        duration: `${3 + (idx % 4) * 0.5}s`,
        size: `${18 + (idx % 5) * 6}px`,
      })),
    [],
  );

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
            <h1 className="title">내 발렌타인이 되줄래?<br/>💘</h1>
            <p className="guide" aria-live="polite">
              예를 5번 누르면 성공! ({yesClicks}/5)
            </p>

            <div className="button-board" ref={boardRef}>
              <button
                ref={yesBtnRef}
                className="btn yes"
                onClick={handleYesClick}
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
              {hearts.map((heart) => (
                <span
                  key={heart.id}
                  className="heart"
                  style={
                    {
                      left: heart.left,
                      animationDelay: heart.delay,
                      animationDuration: heart.duration,
                      fontSize: heart.size,
                    } as CSSProperties
                  }
                >
                  💗
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
