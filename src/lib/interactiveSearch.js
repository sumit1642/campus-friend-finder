import { bfs, dfs, pathTo, commonTraits } from "./graphAlgos.js";
import { recommend } from "./recommender.js";

export const ALGOS = [
	{
		key: "bfs",
		label: "BFS",
		color: "#3d3bc4",
		blurb: "Checks your friends, then their friends, then theirs, level by level. Always finds the shortest route.",
	},
	{
		key: "dfs",
		label: "DFS",
		color: "#c2410c",
		blurb: "Follows one chain of friends as deep as it goes, then backs up. Finds everyone, but routes can wind.",
	},
	{
		key: "score",
		label: "Score",
		color: "#0e9aa7",
		blurb: "The campus recommender: ranks by distance, mutual friends, shared interests and department/year.",
	},
];

export const EMPTY_SEARCH = {
	source: null,
	visitOrder: [],
	parent: new Map(),
	treeEdges: [],
	results: [],
	friendIds: new Set(),
	shortest: new Map(),
};

/**
 * Runs the chosen algorithm from one person's point of view.
 *
 * Every result has the same shape whatever the algorithm:
 *   user, index (position in visitOrder, so the step slider can reveal it),
 *   hops (shortest distance in friendships), route (ids from the start to them),
 *   common (shared traits), mutualNames, and for Score: score, parts, distance.
 *
 * "Possible friends" are people who are not already friends of the start person.
 */
export function runSearch({ algo, users, positions, adjacency, sourceId, maxHops, minCommon, radiusM, weights }) {
	const source = users.find((u) => u.id === sourceId);
	if (!source) return EMPTY_SEARCH;

	const byId = Object.fromEntries(users.map((u) => [u.id, u]));
	const order = Object.fromEntries(users.map((u, i) => [u.id, i]));
	const friendIds = new Set(adjacency[sourceId] ?? []);
	// Shortest hop count to everyone, whatever algorithm is shown. Used for the hop limit.
	const shortest = bfs(adjacency, order, sourceId).depth;

	const mutualOf = (id) => [...adjacency[id]].filter((f) => friendIds.has(f)).sort((a, b) => order[a] - order[b]);
	const namesOf = (ids) => ids.map((id) => byId[id].name);

	if (algo === "score") {
		const students = users.filter((u) => u.id !== sourceId).map((u) => ({ ...u, ...positions[u.id] }));
		const ranked = recommend({
			me: source,
			myPos: positions[sourceId],
			students,
			adjacency,
			friendIds,
			pendingIds: new Set(),
			weights,
			radiusM,
		})
			.map((rec) => ({ rec, common: commonTraits(source, rec.student) }))
			.filter((x) => x.common.count >= minCommon);

		const visitOrder = [sourceId, ...ranked.map((x) => x.rec.student.id)];
		const results = ranked.map(({ rec, common }, i) => {
			const id = rec.student.id;
			const mutual = mutualOf(id);
			return {
				user: byId[id],
				index: i + 1,
				hops: shortest.get(id) ?? null,
				// Best route is through a mutual friend; with none, it is a straight "nearby" line.
				route: mutual.length ? [sourceId, mutual[0], id] : [sourceId, id],
				direct: mutual.length === 0,
				common,
				mutualNames: namesOf(mutual),
				score: rec.score,
				parts: rec.parts,
				distance: rec.distance,
			};
		});
		return { source, visitOrder, parent: new Map(), treeEdges: [], results, friendIds, shortest };
	}

	const run = algo === "dfs" ? dfs(adjacency, order, sourceId) : bfs(adjacency, order, sourceId, maxHops);
	const { visitOrder, parent } = run;
	const treeEdges = visitOrder.slice(1).map((id) => [parent.get(id), id]);

	const results = [];
	visitOrder.forEach((id, index) => {
		if (index === 0 || friendIds.has(id)) return;
		const hops = shortest.get(id);
		if (hops > maxHops) return;
		const common = commonTraits(source, byId[id]);
		if (common.count < minCommon) return;
		results.push({
			user: byId[id],
			index,
			hops,
			route: pathTo(parent, sourceId, id),
			direct: false,
			common,
			mutualNames: namesOf(mutualOf(id)),
		});
	});

	return { source, visitOrder, parent, treeEdges, results, friendIds, shortest };
}
