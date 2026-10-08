import { haversine } from "./geo.js";

export const DEFAULT_WEIGHTS = {
	proximity: 40,
	mutual: 30,
	interests: 20,
	campus: 10,
};

export const FACTORS = [
	{ key: "proximity", label: "Nearby", color: "#0e9aa7" },
	{ key: "mutual", label: "Mutual friends", color: "#3d3bc4" },
	{ key: "interests", label: "Shared interests", color: "#e0a100" },
	{ key: "campus", label: "Same department and year", color: "#8a94a6" },
];

const jaccard = (a, b) => {
	const A = new Set(a);
	const inter = b.filter((x) => A.has(x)).length;
	const union = new Set([...a, ...b]).size;
	return union === 0 ? 0 : inter / union;
};

/**
 * Scores every student who is not already a friend.
 * Each factor is 0..1, then multiplied by its weight (weights are normalised
 * to sum to 1), so the final score is also 0..1 and the parts add up to it.
 */
export function recommend({
	me,
	myPos,
	students, // each has lat/lng already resolved
	adjacency,
	friendIds,
	pendingIds,
	weights,
	radiusM,
}) {
	const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
	const w = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total]));
	const byId = Object.fromEntries(students.map((s) => [s.id, s]));

	return students
		.filter((s) => !friendIds.has(s.id) && !pendingIds.has(s.id))
		.map((s) => {
			const distance = haversine(myPos, s);
			const mutualIds = [...adjacency[s.id]].filter((id) => friendIds.has(id));
			const sharedInterests = s.interests.filter((i) => me.interests.includes(i));

			const raw = {
				proximity: Math.exp(-distance / 250),
				mutual: Math.min(1, mutualIds.length / 3),
				interests: jaccard(me.interests, s.interests),
				campus: (s.dept === me.dept ? 0.7 : 0) + (s.year === me.year ? 0.3 : 0),
			};
			const parts = Object.fromEntries(Object.keys(raw).map((k) => [k, raw[k] * w[k]]));
			const score = Object.values(parts).reduce((a, b) => a + b, 0);

			return {
				student: s,
				distance,
				inRange: distance <= radiusM,
				mutualNames: mutualIds.map((id) => byId[id].name),
				sharedInterests,
				parts,
				score,
			};
		})
		.filter((r) => r.inRange)
		.sort((a, b) => b.score - a.score);
}
