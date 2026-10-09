import { useCallback, useEffect, useMemo, useState } from "react";
import InteractiveMap from "../components/InteractiveMap.jsx";
import InteractiveSidebar from "../components/InteractiveSidebar.jsx";
import { CAMPUS } from "../config.js";
import { randomProfile } from "../data/people.js";
import { useNetwork } from "../hooks/useNetwork.js";
import { offsetToLatLng } from "../lib/geo.js";
import { ALGOS, runSearch } from "../lib/interactiveSearch.js";
import { DEFAULT_WEIGHTS } from "../lib/recommender.js";

const SPEEDS = { slow: 1100, normal: 650, fast: 280 }; // ms per step

export default function InteractiveApp() {
	const net = useNetwork();

	const [sourceId, setSourceId] = useState(null);
	const [selectedId, setSelectedId] = useState(null);
	const [tool, setTool] = useState("select"); // "select" | "connect"
	const [connectFrom, setConnectFrom] = useState(null);
	const [placing, setPlacing] = useState(null); // a profile waiting to be dropped on the map
	const [fitKey, setFitKey] = useState(0);

	const [algo, setAlgo] = useState("bfs");
	const [maxHops, setMaxHops] = useState(3);
	const [minCommon, setMinCommon] = useState(1);
	const [radiusM, setRadiusM] = useState(600);
	const [sortBy, setSortBy] = useState("algo");
	const [showAll, setShowAll] = useState(false);

	// Step animation. Infinity means "fully revealed"; Play counts up from 1.
	const [step, setStep] = useState(Infinity);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState("normal");

	// If the chosen start person is gone (or never chosen), use the first person.
	const effectiveSource = net.users.some((u) => u.id === sourceId) ? sourceId : (net.users[0]?.id ?? null);
	const selected = net.users.find((u) => u.id === selectedId) ?? null;
	const meta = ALGOS.find((a) => a.key === algo);

	// Positions only matter to Score (distance). Leaving them out of the BFS/DFS
	// dependencies means dragging a person does not restart the animation.
	const positionDep = algo === "score" ? net.positions : null;
	const search = useMemo(
		() =>
			runSearch({
				algo,
				users: net.users,
				positions: net.positions,
				adjacency: net.adjacency,
				sourceId: effectiveSource,
				maxHops,
				minCommon,
				radiusM,
				weights: DEFAULT_WEIGHTS,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[algo, net.users, positionDep, net.adjacency, effectiveSource, maxHops, minCommon, radiusM],
	);

	const total = search.visitOrder.length;
	const shownStep = Math.min(step, total);

	// A new search starts fully revealed, so the answer is on screen straight away.
	useEffect(() => {
		setStep(Infinity);
		setPlaying(false);
	}, [search]);

	useEffect(() => {
		if (!playing) return undefined;
		const timer = setInterval(() => setStep((s) => Math.min((Number.isFinite(s) ? s : total) + 1, total)), SPEEDS[speed]);
		return () => clearInterval(timer);
	}, [playing, speed, total]);

	useEffect(() => {
		if (playing && shownStep >= total) setPlaying(false);
	}, [playing, shownStep, total]);

	const results = useMemo(() => {
		const revealed = search.results.filter((r) => r.index < shownStep);
		if (sortBy === "common") return [...revealed].sort((a, b) => b.common.count - a.common.count || a.index - b.index);
		return revealed;
	}, [search, shownStep, sortBy]);

	// --- actions ---------------------------------------------------------------

	const play = () => {
		setStep(1);
		setPlaying(true);
	};
	const scrubTo = (n) => {
		setPlaying(false);
		setStep(n);
	};

	const startPlacing = (profile) => {
		setTool("select");
		setConnectFrom(null);
		setPlacing(profile);
	};
	const cancelPlacing = () => setPlacing(null);

	const addRandom = () => {
		const angle = Math.random() * Math.PI * 2;
		const r = 280 * Math.sqrt(Math.random());
		const at = offsetToLatLng(CAMPUS.center, Math.cos(angle) * r, Math.sin(angle) * r);
		// Link to one or two existing people so the newcomer is part of the network.
		const pool = [...net.users].sort(() => Math.random() - 0.5);
		const links = pool.slice(0, Math.min(pool.length, 1 + Math.floor(Math.random() * 2))).map((u) => u.id);
		setSelectedId(net.addUser(randomProfile(net.users), at, links));
	};

	const handleMapClick = (latlng) => {
		if (placing) {
			setSelectedId(net.addUser(placing, latlng));
			setPlacing(null);
			return;
		}
		if (tool === "select") setSelectedId(null);
	};

	const handleMarkerClick = (id) => {
		if (tool === "connect") {
			if (!connectFrom) setConnectFrom(id);
			else if (connectFrom === id) setConnectFrom(null);
			else {
				net.toggleEdge(connectFrom, id); // links them, or unlinks if already friends
				setConnectFrom(null);
			}
			return;
		}
		setSelectedId(id);
	};

	const removeUser = (id) => {
		net.removeUser(id);
		setSelectedId(null);
		if (connectFrom === id) setConnectFrom(null);
	};

	const loadDemo = () => {
		net.loadDemo();
		setSourceId("u1");
		setSelectedId(null);
		setConnectFrom(null);
		setPlacing(null);
		setFitKey((k) => k + 1);
	};

	const clearAll = () => {
		net.clearAll();
		setSourceId(null);
		setSelectedId(null);
		setConnectFrom(null);
		setPlacing(null);
	};

	// Esc backs out of whatever is half done.
	useEffect(() => {
		const onKey = (e) => {
			if (e.key !== "Escape") return;
			setPlacing(null);
			setConnectFrom(null);
			setTool("select");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const nameOf = useCallback((id) => net.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "", [net.users]);
	let hint = "";
	if (placing) hint = `Click the map to place ${placing.name} (Esc cancels)`;
	else if (tool === "connect")
		hint = connectFrom ?
				`Now click who ${nameOf(connectFrom)} should be friends with (click friends again to unlink)`
			:	"Click the first person";

	return (
		<div className="app">
			<InteractiveSidebar
				users={net.users}
				adjacency={net.adjacency}
				selected={selected}
				onSelect={setSelectedId}
				sourceId={effectiveSource}
				onSetSource={setSourceId}
				placing={placing}
				onStartPlace={startPlacing}
				onCancelPlace={cancelPlacing}
				onAddRandom={addRandom}
				onUpdate={net.updateUser}
				onRemove={removeUser}
				onToggleEdge={net.toggleEdge}
				onLoadDemo={loadDemo}
				onClear={clearAll}
				algo={algo}
				setAlgo={setAlgo}
				maxHops={maxHops}
				setMaxHops={setMaxHops}
				minCommon={minCommon}
				setMinCommon={setMinCommon}
				radiusM={radiusM}
				setRadiusM={setRadiusM}
				sortBy={sortBy}
				setSortBy={setSortBy}
				showAll={showAll}
				setShowAll={setShowAll}
				search={search}
				step={shownStep}
				total={total}
				onStep={scrubTo}
				playing={playing}
				onPlay={play}
				onPause={() => setPlaying(false)}
				speed={speed}
				setSpeed={setSpeed}
				results={results}
				onAddFriend={(id) => net.toggleEdge(effectiveSource, id)}
			/>
			<main className={`stage${placing ? " is-placing" : ""}${tool === "connect" ? " is-connecting" : ""}`}>
				<InteractiveMap
					users={net.users}
					positions={net.positions}
					edges={net.edges}
					search={search}
					step={shownStep}
					algo={algo}
					color={meta.color}
					sourceId={effectiveSource}
					selectedId={selectedId}
					connectFrom={connectFrom}
					tool={tool}
					showAll={showAll}
					fitKey={fitKey}
					onMapClick={handleMapClick}
					onMarkerClick={handleMarkerClick}
					onMove={net.moveUser}
				/>
				<div
					className="map-toolbar"
					role="toolbar"
					aria-label="Map tools">
					<div
						className="seg"
						role="group"
						aria-label="Tool">
						<button
							type="button"
							aria-pressed={tool === "select"}
							onClick={() => {
								setTool("select");
								setConnectFrom(null);
							}}>
							Move &amp; select
						</button>
						<button
							type="button"
							aria-pressed={tool === "connect"}
							onClick={() => {
								setTool("connect");
								setPlacing(null);
							}}>
							Connect friends
						</button>
					</div>
					<button
						type="button"
						className="ghost"
						disabled={net.users.length === 0}
						onClick={() => setFitKey((k) => k + 1)}>
						Fit all
					</button>
					{hint && (
						<span
							className="hint"
							role="status">
							{hint}
						</span>
					)}
				</div>
				{net.users.length === 0 && !placing && (
					<div className="map-empty">
						<strong>Nobody here yet</strong>
						<span>Add a person from the sidebar, or load the demo network to see the algorithms straight away.</span>
					</div>
				)}
			</main>
		</div>
	);
}
