import { useEffect, useState } from "react";
import { TICK_MS, TIME_LAPSE } from "../config.js";

/**
 * Simulates students walking around campus. Swap this hook for a WebSocket /
 * Firebase / Supabase subscription to get real live positions.
 */
export function useLiveStudents(initial, { live, radiusM }) {
	const [students, setStudents] = useState(initial);

	useEffect(() => {
		if (!live) return undefined;
		const timer = setInterval(() => {
			setStudents((prev) =>
				prev.map((s) => {
					let h = s.h + (Math.random() - 0.5) * 0.9;
					const step = s.speed * TIME_LAPSE * (TICK_MS / 1000);
					let x = s.x + Math.cos(h) * step;
					let y = s.y + Math.sin(h) * step;
					const r = Math.hypot(x, y);
					if (r > radiusM) {
						x = (x / r) * radiusM * 0.97;
						y = (y / r) * radiusM * 0.97;
						h += Math.PI;
					}
					return { ...s, x, y, h };
				}),
			);
		}, TICK_MS);
		return () => clearInterval(timer);
	}, [live, radiusM]);

	return students;
}
