// Pure graph helpers for the interactive mode. No React and no map code here,
// so they can be read (and tested) on their own.
//
// A graph is `adj`: { [userId]: Set<userId> }.
// `order` maps userId -> creation index. Neighbours are always visited in that
// order, so the same network gives the same traversal every time.

const neighboursOf = (adj, order, id) => [...(adj[id] ?? [])].sort((a, b) => order[a] - order[b]);

/**
 * Breadth-first search: friends first, then friends of friends, and so on.
 * Because it goes level by level, the route it finds to anyone is the shortest.
 *
 * Returns
 *   visitOrder  ids in the order they were discovered (source first)
 *   parent      id -> the person we reached it from (the BFS tree)
 *   depth       id -> number of hops from the source
 */
export function bfs(adj, order, source, maxDepth = Infinity) {
	const visitOrder = [source];
	const parent = new Map();
	const depth = new Map([[source, 0]]);
	const queue = [source];

	for (let head = 0; head < queue.length; head++) {
		const node = queue[head];
		if (depth.get(node) >= maxDepth) continue; // do not look past the hop limit
		for (const next of neighboursOf(adj, order, node)) {
			if (depth.has(next)) continue;
			depth.set(next, depth.get(node) + 1);
			parent.set(next, node);
			visitOrder.push(next);
			queue.push(next);
		}
	}
	return { visitOrder, parent, depth };
}

/**
 * Depth-first search: follow one chain of friends as far as it goes, then back up.
 * It reaches everyone in the connected group, but the route to a person is just
 * the chain DFS happened to take, so it is often longer than the shortest one.
 *
 * Uses an explicit stack (same visit order as the recursive version), so a long
 * chain of friends cannot overflow the call stack.
 */
export function dfs(adj, order, source) {
	const visitOrder = [source];
	const parent = new Map();
	const depth = new Map([[source, 0]]);
	const stack = [{ id: source, next: neighboursOf(adj, order, source), i: 0 }];

	while (stack.length) {
		const top = stack[stack.length - 1];
		if (top.i >= top.next.length) {
			stack.pop(); // dead end, back up one person
			continue;
		}
		const child = top.next[top.i++];
		if (depth.has(child)) continue;
		depth.set(child, depth.get(top.id) + 1);
		parent.set(child, top.id);
		visitOrder.push(child);
		stack.push({ id: child, next: neighboursOf(adj, order, child), i: 0 });
	}
	return { visitOrder, parent, depth };
}

/** Walks the parent links back from `target` to `source`. Null if unreachable. */
export function pathTo(parent, source, target) {
	if (source === target) return [source];
	const path = [target];
	let cur = target;
	while (cur !== source) {
		cur = parent.get(cur);
		if (cur === undefined) return null;
		path.push(cur);
	}
	return path.reverse();
}

/** What two people have in common: shared interests, same department, same year. */
export function commonTraits(a, b) {
	const mine = new Set(a.interests);
	const interests = b.interests.filter((i) => mine.has(i));
	const sameDept = a.dept === b.dept;
	const sameYear = a.year === b.year;
	return {
		interests,
		sameDept,
		sameYear,
		count: interests.length + (sameDept ? 1 : 0) + (sameYear ? 1 : 0),
	};
}
