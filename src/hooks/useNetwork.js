import { useCallback, useEffect, useMemo, useReducer } from "react";
import { makeDemoNetwork } from "../data/demoNetwork.js";

// The tester's own network lives here: people (profiles), where they stand on
// the map, and who is friends with whom. It is saved in the browser so a reload
// in the middle of a presentation does not lose it. The seeded mode never uses it.

const STORAGE_KEY = "campus-friend-finder:interactive:v1";
const EMPTY = { users: [], pos: {}, edges: [], nextId: 1 };

const isEdge = (e, a, b) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a);

function reducer(state, action) {
	switch (action.type) {
		case "add":
			return {
				users: [...state.users, action.user],
				pos: { ...state.pos, [action.user.id]: action.latlng },
				edges: [...state.edges, ...action.links.map((other) => [action.user.id, other])],
				nextId: state.nextId + 1,
			};
		case "update":
			return { ...state, users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)) };
		case "move":
			return { ...state, pos: { ...state.pos, [action.id]: action.latlng } };
		case "remove": {
			const pos = { ...state.pos };
			delete pos[action.id];
			return {
				...state,
				users: state.users.filter((u) => u.id !== action.id),
				pos,
				edges: state.edges.filter((e) => e[0] !== action.id && e[1] !== action.id),
			};
		}
		case "toggleEdge": {
			const exists = state.edges.some((e) => isEdge(e, action.a, action.b));
			return {
				...state,
				edges:
					exists ?
						state.edges.filter((e) => !isEdge(e, action.a, action.b))
					:	[...state.edges, [action.a, action.b]],
			};
		}
		case "replace":
			return action.state;
		default:
			return state;
	}
}

// Anything in storage might be stale or hand-edited, so rebuild it field by field.
function load() {
	try {
		const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
		if (!data || !Array.isArray(data.users) || !Array.isArray(data.edges) || !data.pos) return EMPTY;
		const ok = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
		const users = data.users
			.filter((u) => u && typeof u.id === "string" && typeof u.name === "string" && ok(data.pos[u.id]))
			.map((u) => ({
				id: u.id,
				name: u.name,
				dept: String(u.dept),
				year: Number(u.year) || 1,
				interests: Array.isArray(u.interests) ? u.interests.filter((i) => typeof i === "string") : [],
			}));
		const ids = new Set(users.map((u) => u.id));
		const edges = data.edges.filter((e) => Array.isArray(e) && e[0] !== e[1] && ids.has(e[0]) && ids.has(e[1]));
		const pos = Object.fromEntries(users.map((u) => [u.id, { lat: data.pos[u.id].lat, lng: data.pos[u.id].lng }]));
		const highest = users.reduce((m, u) => Math.max(m, Number(u.id.slice(1)) || 0), 0);
		return { users, pos, edges, nextId: Math.max(Number(data.nextId) || 1, highest + 1) };
	} catch {
		return EMPTY;
	}
}

export function useNetwork() {
	const [state, dispatch] = useReducer(reducer, undefined, load);

	useEffect(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Private mode or full storage: the network still works, it just will not survive a reload.
		}
	}, [state]);

	// { [id]: Set<id> }, built from the edge list. Everyone gets an entry, even with no friends.
	const adjacency = useMemo(() => {
		const adj = Object.fromEntries(state.users.map((u) => [u.id, new Set()]));
		for (const [a, b] of state.edges) {
			adj[a]?.add(b);
			adj[b]?.add(a);
		}
		return adj;
	}, [state.users, state.edges]);

	const addUser = useCallback(
		(profile, latlng, links = []) => {
			const id = `u${state.nextId}`;
			dispatch({ type: "add", user: { id, ...profile }, latlng, links });
			return id;
		},
		[state.nextId],
	);
	const updateUser = useCallback((id, patch) => dispatch({ type: "update", id, patch }), []);
	const moveUser = useCallback((id, latlng) => dispatch({ type: "move", id, latlng }), []);
	const removeUser = useCallback((id) => dispatch({ type: "remove", id }), []);
	const toggleEdge = useCallback((a, b) => dispatch({ type: "toggleEdge", a, b }), []);
	const loadDemo = useCallback(() => dispatch({ type: "replace", state: makeDemoNetwork() }), []);
	const clearAll = useCallback(() => dispatch({ type: "replace", state: { ...EMPTY, nextId: state.nextId } }), [state.nextId]);

	return {
		users: state.users,
		positions: state.pos,
		edges: state.edges,
		adjacency,
		addUser,
		updateUser,
		moveUser,
		removeUser,
		toggleEdge,
		loadDemo,
		clearAll,
	};
}
