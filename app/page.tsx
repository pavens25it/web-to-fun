"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, Heart, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { content } from "../lib/content";

const ease = [0.22, 1, 0.36, 1] as const;
type GamePhase = "intro" | "playing" | "won" | "lost";
type FallingItem = { id: number; x: number; y: number; kind: "star" | "heart" };
type Milestone = 3 | 6 | 10 | null;
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, delay, ease }}>{children}</motion.div>;
}
function Grain() { return <div className="grain" aria-hidden="true" />; }

export default function Home() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [music, setMusic] = useState(false), [selected, setSelected] = useState<number | null>(null), [menu, setMenu] = useState(false), [activeTrait, setActiveTrait] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>("intro"), [gameScore, setGameScore] = useState(0), [gameTime, setGameTime] = useState(30), [playerX, setPlayerX] = useState(50), [fallingItems, setFallingItems] = useState<FallingItem[]>([]), [gameMessage, setGameMessage] = useState(""), [milestone, setMilestone] = useState<Milestone>(null), [secretVisible, setSecretVisible] = useState(false), [gameSound, setGameSound] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null), playerXRef = useRef(50), scoreRef = useRef(0), itemIdRef = useRef(0), winTimeoutRef = useRef<number | null>(null), milestoneTimeoutRef = useRef<number | null>(null), seenMilestonesRef = useRef<Set<number>>(new Set()), itemsRef = useRef<FallingItem[]>([]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.14]);
  useEffect(() => { const handler = (e: MouseEvent) => document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`); window.addEventListener("mousemove", handler); return () => window.removeEventListener("mousemove", handler); }, []);
  const playCollectSound = () => {
    if (!gameSound || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass(), oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.frequency.value = 620; oscillator.type = "sine"; gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .18);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .18);
  };
  const startGame = () => {
    if (winTimeoutRef.current) window.clearTimeout(winTimeoutRef.current);
    if (milestoneTimeoutRef.current) window.clearTimeout(milestoneTimeoutRef.current);
    winTimeoutRef.current = null;
    milestoneTimeoutRef.current = null;
    seenMilestonesRef.current.clear();
    scoreRef.current = 0;
    playerXRef.current = 50;
    itemIdRef.current = 0;
    itemsRef.current = [
      { id: itemIdRef.current++, x: 18, y: -25, kind: "star" },
      { id: itemIdRef.current++, x: 50, y: -145, kind: "star" },
      { id: itemIdRef.current++, x: 82, y: -265, kind: "heart" },
    ];
    setGameScore(0); setGameTime(30); setPlayerX(50); setFallingItems(itemsRef.current); setGameMessage(""); setMilestone(null); setSecretVisible(false); setGamePhase("playing");
  };
  const showMilestone = (nextMilestone: Exclude<Milestone, null>, message: string) => {
    if (seenMilestonesRef.current.has(nextMilestone)) return;
    seenMilestonesRef.current.add(nextMilestone);
    setGameMessage(message);
    setMilestone(nextMilestone);
    if (milestoneTimeoutRef.current) window.clearTimeout(milestoneTimeoutRef.current);
    milestoneTimeoutRef.current = window.setTimeout(() => { setMilestone(null); setGameMessage(""); }, nextMilestone === 10 ? 1800 : 3200);
  };
  const movePlayer = (clientX: number) => { const area = gameAreaRef.current; if (!area) return; const next = Math.max(8, Math.min(92, ((clientX - area.getBoundingClientRect().left) / area.clientWidth) * 100)); playerXRef.current = next; setPlayerX(next); };
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const onKeyDown = (event: KeyboardEvent) => { if (!["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(event.key)) return; event.preventDefault(); const direction = event.key === "ArrowLeft" || event.key.toLowerCase() === "a" ? -1 : 1; const next = Math.max(8, Math.min(92, playerXRef.current + direction * 5)); playerXRef.current = next; setPlayerX(next); };
    window.addEventListener("keydown", onKeyDown);
    let frame = 0, last = performance.now(), spawnAt = 0;
    const area = gameAreaRef.current;
    if (area && itemsRef.current.length > 0) {
      itemsRef.current = itemsRef.current.map((item, index) => ({ ...item, x: [0.18, 0.5, 0.82][index] * area.clientWidth }));
      setFallingItems([...itemsRef.current]);
    } else if (itemsRef.current.length === 0) {
      itemsRef.current = [
        { id: itemIdRef.current++, x: 20, y: -25, kind: "star" },
        { id: itemIdRef.current++, x: 55, y: -150, kind: "star" },
      ];
      setFallingItems([...itemsRef.current]);
    }
    const tick = (now: number) => {
      const area = gameAreaRef.current; if (!area) { frame = requestAnimationFrame(tick); return; }
      const delta = Math.min((now - last) / 1000, .05); last = now; spawnAt += delta;
      const height = area.clientHeight, width = area.clientWidth;
      const updatedItems = itemsRef.current.map(item => ({ ...item, y: item.y + (115 + (item.id % 3) * 28) * delta }));
      const caught = updatedItems.filter(item => item.y > height - 100 && Math.abs(item.x - (playerXRef.current / 100) * width) < 78);
      if (caught.length) {
        const previousScore = scoreRef.current;
        scoreRef.current = Math.min(10, scoreRef.current + caught.length);
        setGameScore(scoreRef.current);
        playCollectSound();
        if (previousScore < 3 && scoreRef.current >= 3) showMilestone(3, "You're already my favourite person.");
        else if (previousScore < 6 && scoreRef.current >= 6) showMilestone(6, "Just a little reminder that you're special.");
        if (scoreRef.current >= 10) {
          showMilestone(10, "You collected them all! But you already have my whole heart.");
          winTimeoutRef.current = window.setTimeout(() => setGamePhase("won"), 1800);
        }
      }
      const caughtIds = new Set(caught.map(item => item.id));
      itemsRef.current = updatedItems.filter(item => item.y < height + 40 && !caughtIds.has(item.id));
      if (spawnAt >= .45) {
        spawnAt = 0;
        itemsRef.current.push({ id: itemIdRef.current++, x: 30 + Math.random() * Math.max(1, width - 60), y: -30, kind: Math.random() > .16 ? "star" : "heart" });
      }
      setFallingItems([...itemsRef.current]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); itemsRef.current = []; setFallingItems([]); window.removeEventListener("keydown", onKeyDown); };
  }, [gamePhase, gameSound]);
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const timer = window.setInterval(() => setGameTime(current => { if (current <= 1) { setGamePhase("lost"); return 0; } return current - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [gamePhase]);
  return <main>
    <Grain /><motion.div className="progress" style={{ scaleX: progress }} />
    <header className="nav"><a href="#top" className="monogram">K<span>♥</span></a><div className={`nav-links ${menu ? "open" : ""}`}><a href="#story" onClick={() => setMenu(false)}>the story</a><a href="#memories" onClick={() => setMenu(false)}>memories</a><a href="#letter" onClick={() => setMenu(false)}>the letter</a></div><button className="music-toggle" onClick={() => setMusic(!music)} aria-label={music ? "Turn music off" : "Turn music on"}>{music ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>{music ? "sound on" : "sound off"}</span></button><button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Toggle menu"><span /><span /></button></header>
    <section id="top" className="hero">
      <motion.div className="hero-atmosphere" style={{ scale: heroScale }} aria-hidden="true" />
      <div className="hero-orbit-art" aria-hidden="true"><div className="hero-orbit hero-orbit-a" /><div className="hero-orbit hero-orbit-b" /><div className="hero-orbit hero-orbit-c" /><div className="hero-orbit-core">K<span>✦</span></div><i className="hero-particle particle-a" /><i className="hero-particle particle-b" /><i className="hero-particle particle-c" /></div>
      <div className="hero-stamp">A LOVE LETTER<br /><span>in progress</span></div>
      <div className="hero-content">
        <motion.p className="eyebrow hero-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .15, ease }}>MADE FOR ONE PERSON. WITH ALL MY HEART.</motion.p>
        <motion.p className="hero-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .3, ease }}>Hey, Kesh.<br /><span>This little universe exists because of you.</span></motion.p>
        <h1 className="hero-headline" aria-label="In this lifetime, it's you."><span className="hero-line line-one"><motion.span initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .9, delay: .35, ease }}>IN THIS</motion.span></span><span className="hero-line line-two"><motion.span initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .9, delay: .5, ease }}>LIFETIME,</motion.span></span><span className="hero-line line-three"><motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .65, ease }}>IT&apos;S <em>YOU.</em></motion.span></span></h1>
        <div className="hero-bottom"><p className="hero-emotional">Of all the places I could be,<br />I&apos;m glad I found you.</p><a className="hero-cta" href="#story"><span>ENTER MY UNIVERSE</span><ArrowUpRight size={22} /></a></div>
      </div>
      <div className="hero-side">SCROLL TO EXPLORE <span>↓</span></div>
      <div className="hero-coordinate">05°05&apos; / 149°3&apos; <span>♡</span></div>
    </section>
    <section id="story" className="story section-pad"><div className="section-index">02 <span>—</span> THE STORY</div><Reveal><p className="display-text">Out of everyone<br />in this <span>universe,</span><br />somehow, I found you.</p></Reveal><div className="story-note"><ArrowUpRight size={17} /><p>And somehow, you keep making<br />my world feel more like itself.</p></div></section>
    <section className="universe section-pad"><div className="universe-heading"><div className="section-index">03 <span>—</span> HER UNIVERSE</div><div className="universe-title"><h2>{content.universeIntro}</h2><p>{content.universeSubtitle}</p></div></div><div className="orbit-layout"><div className="orbit-copy"><span className="orbit-kicker">I notice everything.</span><p>It&apos;s not just that I love you. I love all the little things that make you who you are.</p><span className="tiny-label">[ click an observation ]</span></div><div className="orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><div className="orbit-core">K<br /><span>✦</span></div><div className="orbit-dot dot-one" /><div className="orbit-dot dot-two" /></div><div className="trait-list">{content.universeTraits.map((trait, i) => <Reveal key={trait.label} delay={i * 0.08}><button className={`trait ${activeTrait === i ? "active" : ""}`} onClick={() => setActiveTrait(i)} aria-expanded={activeTrait === i}><span>0{i + 1}</span><div><h3>{trait.label}</h3><AnimatePresence initial={false}>{activeTrait === i && <motion.p initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: .35, ease }}>{trait.value}</motion.p>}</AnimatePresence></div><span className="trait-mark">{activeTrait === i ? "−" : "+"}</span></button></Reveal>)}</div></div></section>
    <section id="memories" className="memories section-pad"><div className="memories-top"><div className="section-index">04 <span>—</span> OUR MEMORIES</div><p>Every photograph is<br />a door I can walk through.</p></div><div className="gallery">{content.memories.map((memory, i) => <motion.button className={`photo-card card-${i + 1}`} key={memory.number} onClick={() => setSelected(i)} whileHover={{ y: -10, rotate: i === 1 ? 0 : i === 0 ? -2 : 2 }} transition={{ duration: 0.35 }}><div className="image-wrap"><Image src={memory.image} alt={memory.caption} fill sizes="(max-width: 700px) 80vw, 35vw" /></div><div className="photo-meta"><span>{memory.number}</span><span>{memory.detail}</span></div><h3>{memory.caption}</h3><ArrowUpRight size={17} /></motion.button>)}</div></section>
    <section id="quest" className="quest section-pad">
      <div className="section-index">05 <span>—</span> A LITTLE QUEST FOR YOU</div>
      <div className="quest-shell">
        <div className="quest-header"><div><p className="quest-kicker">A tiny arcade hidden in the universe</p><h2>Collect a<br /><em>little love.</em></h2></div><div className="quest-score"><span>STARS COLLECTED</span><strong>{String(gameScore).padStart(2, "0")} <i>/ 10</i></strong></div></div>
        <AnimatePresence>
          {gamePhase === "intro" && <motion.div className="quest-panel quest-intro" key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><span className="quest-badge">MISSION 01 / FOR KESH</span><h3>HEY, KESH.</h3><p>I have a tiny mission for you.<br /><span>Collect 10 stars to unlock something special.</span></p><button className="game-button" onClick={startGame}>START GAME <ArrowUpRight size={18} /></button><div className="quest-controls">← → or A / D <span>·</span> drag on mobile</div></motion.div>}
          {gamePhase === "playing" && <motion.div className="quest-panel quest-playing" key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="game-hud"><span>TIME <b>00:{String(gameTime).padStart(2, "0")}</b></span><button className="game-sound" onClick={() => setGameSound(!gameSound)} aria-label={gameSound ? "Turn game sound off" : "Turn game sound on"}>{gameSound ? <Volume2 size={15} /> : <VolumeX size={15} />} {gameSound ? "sound on" : "sound off"}</button></div><div className="game-area" ref={gameAreaRef} onPointerDown={(event) => movePlayer(event.clientX)} onPointerMove={(event) => { if (event.buttons > 0) movePlayer(event.clientX); }}><div className="game-starscape" />{fallingItems.map(item => <motion.span key={item.id} className={`falling-item ${item.kind}`} style={{ left: item.x, top: item.y }}>{item.kind === "star" ? "✦" : "♥"}</motion.span>)}<motion.div className="player" animate={{ left: `${playerX}%` }} transition={{ type: "spring", stiffness: 500, damping: 35 }}><span>♡</span></motion.div><AnimatePresence>{milestone === 3 && <motion.div className="milestone milestone-three" key="milestone-three" initial={{ opacity: 0, scale: .7, rotate: -8, x: -18 }} animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }} exit={{ opacity: 0, y: -25 }} transition={{ duration: .6, ease }}><i>✦</i><span>{gameMessage}</span><b>✦</b></motion.div>}{milestone === 6 && <motion.div className="milestone milestone-six" key="milestone-six" initial={{ opacity: 0, x: 55 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 35 }} transition={{ duration: .7, ease }}><span>{gameMessage}</span><i>♡</i></motion.div>}{milestone === 10 && <motion.div className="milestone milestone-ten" key="milestone-ten" initial={{ opacity: 0, scale: .55 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15 }} transition={{ duration: .9, ease }}><div className="celebration-particles"><i>♥</i><i>✦</i><i>♥</i><i>✦</i><i>♥</i></div><strong>10 / 10</strong><span>{gameMessage}</span><small>you have my whole heart</small></motion.div>}</AnimatePresence></div><p className="game-tip">Catch the falling stars with your little heart.</p></motion.div>}
          {gamePhase === "won" && <motion.div className="quest-panel quest-result" key="won" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span className="quest-badge">MISSION COMPLETE / 10 OF 10</span><h3>YOU DID IT, KESH!</h3><p>But here&apos;s the thing...</p><strong>You don&apos;t need to collect stars to be special.<br />You already light up my entire universe.</strong>{!secretVisible ? <button className="game-button" onClick={() => setSecretVisible(true)}>UNLOCK YOUR SURPRISE ♥</button> : <motion.div className="secret-note" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}><span>JUST FOR YOU</span><p>{content.gameSecret}</p></motion.div>}</motion.div>}
          {gamePhase === "lost" && <motion.div className="quest-panel quest-result" key="lost" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><span className="quest-badge">TIME&apos;S UP / NICE TRY</span><h3>THE STARS GOT SHY.</h3><p>You were so close — and the universe is always happy to give you another chance.</p><button className="game-button" onClick={startGame}>PLAY AGAIN <ArrowUpRight size={18} /></button></motion.div>}
        </AnimatePresence>
      </div>
    </section>
    <section id="letter" className="letter section-pad"><div className="section-index">06 <span>—</span> THE LETTER</div><div className="letter-layout"><div className="letter-aside"><span>For Kesh</span><Heart size={28} fill="currentColor" /><small>read slowly<br />read twice</small></div><motion.article initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}><p className="letter-date">{content.letterDate}</p>{content.letter.map((paragraph, i) => <p className={i === 0 ? "salutation" : ""} key={i}>{paragraph}</p>)}</motion.article></div></section>
    <section className="ending section-pad"><div className="ending-mark">✦</div><p className="eyebrow">07 / THE END, FOR NOW</p><h2><span>If life repeats a million times,</span><br /><em>I&apos;d still choose you.</em></h2><p className="ending-last">Every single time.</p><div className="signature">Yours, always. <span>♥</span></div><a href="#top" className="back-top">Back to the beginning <ArrowUp size={16} /></a></section>
    {selected !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Memory viewer" onClick={() => setSelected(null)}><button className="close-lightbox" onClick={() => setSelected(null)} aria-label="Close"><X /></button><button className="lightbox-arrow prev" onClick={(e) => { e.stopPropagation(); setSelected((selected - 1 + content.memories.length) % content.memories.length); }} aria-label="Previous"><ChevronLeft /></button><div className="lightbox-image" onClick={(e) => e.stopPropagation()}><Image src={content.memories[selected].image} alt={content.memories[selected].caption} fill sizes="90vw" /></div><button className="lightbox-arrow next" onClick={(e) => { e.stopPropagation(); setSelected((selected + 1) % content.memories.length); }} aria-label="Next"><ChevronRight /></button></div>}
  </main>;
}
