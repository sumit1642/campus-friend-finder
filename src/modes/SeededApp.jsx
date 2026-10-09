import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import MapView from "../components/MapView.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { CAMPUS } from "../config.js";
import { makeStudents, INITIAL_FRIEND_IDS } from "../data/students.js";
import { offsetToLatLng } from "../lib/geo.js";
import { recommend, DEFAULT_WEIGHTS } from "../lib/recommender.js";
import { useLiveStudents } from "../hooks/useLiveStudents.js";

const { students: SEED_STUDENTS, adjacency } = makeStudents();

export default function SeededApp() {
	const [anchor, setAnchor] = useState(CAMPUS.center);
	const [myPos, setMyPos] = useState(CAMPUS.center);
	const [me, setMe] = useState({
		dept: "Computer Science",
		year: 2,
		interests: ["Coding", "Music", "Football"],
	});
	const [friendIds, setFriendIds] = useState(() => new Set(INITIAL_FRIEND_IDS));
	const [pendingIds, setPendingIds] = useState(() => new Set());
	const [radiusM, setRadiusM] = useState(300);
	const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
	const [live, setLive] = useState(true);
	const [selectedId, setSelectedId] = useState(null);
	const [gpsError, setGpsError] = useState("");

	const moving = useLiveStudents(SEED_STUDENTS, {
		live,
		radiusM: CAMPUS.simulationRadiusM,
	});

	// Resolve metre offsets into real lat/lng around the current anchor.
	const students = useMemo(
		() => moving.map((s) => ({ ...s, ...offsetToLatLng(anchor, s.x, s.y) })),
		[moving, anchor],
	);

	const recs = useMemo(
		() => recommend({ me, myPos, students, adjacency, friendIds, pendingIds, weights, radiusM }),
		[me, myPos, students, friendIds, pendingIds, weights, radiusM],
	);

	// Pretend the other student accepts after a moment.
	const timers = useRef([]);
	useEffect(() => () => timers.current.forEach(clearTimeout), []);
	const addFriend = useCallback((id) => {
		setPendingIds((p) => new Set(p).add(id));
		const t = setTimeout(() => {
			setPendingIds((p) => {
				const n = new Set(p);
				n.delete(id);
				return n;
			});
			setFriendIds((f) => new Set(f).add(id));
		}, 1200);
		timers.current.push(t);
	}, []);

	const useGps = () => {
		setGpsError("");
		if (!navigator.geolocation) {
			setGpsError("This browser can't share your location.");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(p) => {
				const here = { lat: p.coords.latitude, lng: p.coords.longitude };
				setAnchor(here); // simulated students are re-created around you
				setMyPos(here);
			},
			() => setGpsError("Location was blocked. Allow it in the browser and try again."),
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	};

	const backToCampus = () => {
		setGpsError("");
		setAnchor(CAMPUS.center);
		setMyPos(CAMPUS.center);
	};

	return (
		<div className="app">
			<Sidebar
				me={me}
				setMe={setMe}
				radiusM={radiusM}
				setRadiusM={setRadiusM}
				weights={weights}
				setWeights={setWeights}
				live={live}
				setLive={setLive}
				recs={recs}
				friendCount={friendIds.size}
				pendingCount={pendingIds.size}
				selectedId={selectedId}
				onSelect={setSelectedId}
				onAdd={addFriend}
				onUseGps={useGps}
				onReset={backToCampus}
				gpsError={gpsError}
			/>
			<main className="stage">
				<MapView
					anchor={anchor}
					myPos={myPos}
					onMoveMe={setMyPos}
					students={students}
					friendIds={friendIds}
					pendingIds={pendingIds}
					recs={recs}
					radiusM={radiusM}
					selectedId={selectedId}
					onSelect={setSelectedId}
				/>
			</main>
		</div>
	);
}
