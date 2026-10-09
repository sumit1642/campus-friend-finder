import { useState } from "react";
import SeededApp from "./modes/SeededApp.jsx";
import InteractiveApp from "./modes/InteractiveApp.jsx";

const MODE_KEY = "campus-friend-finder:mode";

const MODES = [
	{ key: "seeded", label: "Seeded campus" },
	{ key: "interactive", label: "Interactive" },
];

function loadMode() {
	try {
		const saved = window.localStorage.getItem(MODE_KEY);
		return MODES.some((m) => m.key === saved) ? saved : "seeded";
	} catch {
		return "seeded";
	}
}

/**
 * Two ways to present the project:
 *  - Seeded: the original simulated campus (unchanged).
 *  - Interactive: the tester creates people, profiles and friendships, then runs
 *    BFS, DFS or the score recommender and sees the routes drawn on the map.
 * Switching modes starts the seeded view fresh; the interactive network is kept.
 */
export default function App() {
	const [mode, setMode] = useState(loadMode);

	const choose = (next) => {
		setMode(next);
		try {
			window.localStorage.setItem(MODE_KEY, next);
		} catch {
			// Not being able to remember the mode is fine.
		}
	};

	return (
		<>
			<div
				className="mode-switch"
				role="group"
				aria-label="Mode">
				{MODES.map((m) => (
					<button
						type="button"
						key={m.key}
						aria-pressed={mode === m.key}
						onClick={() => choose(m.key)}>
						{m.label}
					</button>
				))}
			</div>
			{mode === "seeded" ? <SeededApp /> : <InteractiveApp />}
		</>
	);
}
