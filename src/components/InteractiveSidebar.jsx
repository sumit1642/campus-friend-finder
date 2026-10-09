import { useEffect, useState } from "react";
import { DEPARTMENTS, INTERESTS } from "../data/students.js";
import { suggestName } from "../data/people.js";
import { ALGOS } from "../lib/interactiveSearch.js";
import { FACTORS } from "../lib/recommender.js";
import { formatDistance } from "../lib/geo.js";

// --- small shared pieces -----------------------------------------------------

function InterestChips({ value, onToggle, label }) {
	return (
		<div
			className="chips"
			role="group"
			aria-label={label}>
			{INTERESTS.map((i) => (
				<button
					type="button"
					key={i}
					className={`chip${value.includes(i) ? " on" : ""}`}
					aria-pressed={value.includes(i)}
					onClick={() => onToggle(i)}>
					{i}
				</button>
			))}
		</div>
	);
}

function DeptYear({ dept, year, onChange }) {
	return (
		<div className="row">
			<label>
				Department
				<select
					value={dept}
					onChange={(e) => onChange({ dept: e.target.value })}>
					{DEPARTMENTS.map((d) => (
						<option key={d}>{d}</option>
					))}
				</select>
			</label>
			<label>
				Year
				<select
					value={year}
					onChange={(e) => onChange({ year: Number(e.target.value) })}>
					{[1, 2, 3, 4].map((y) => (
						<option
							key={y}
							value={y}>
							{y}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}

const toggled = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

// --- add a person ------------------------------------------------------------

function AddUserForm({ users, placing, onStartPlace, onCancelPlace, onAddRandom }) {
	const [draft, setDraft] = useState(() => ({
		name: suggestName(users),
		dept: DEPARTMENTS[0],
		year: 1,
		interests: [],
	}));

	// After someone is added or removed, offer a fresh name.
	useEffect(() => {
		setDraft((d) => ({ ...d, name: suggestName(users) }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [users.length]);

	const submit = (e) => {
		e.preventDefault();
		if (draft.name.trim()) onStartPlace({ ...draft, name: draft.name.trim() });
	};

	return (
		<form
			onSubmit={submit}
			className="add-form">
			<h3>Add a person</h3>
			<label>
				Name
				<input
					type="text"
					className="text"
					value={draft.name}
					maxLength={40}
					onChange={(e) => setDraft({ ...draft, name: e.target.value })}
				/>
			</label>
			<DeptYear
				dept={draft.dept}
				year={draft.year}
				onChange={(patch) => setDraft({ ...draft, ...patch })}
			/>
			<InterestChips
				label="Interests for the new person"
				value={draft.interests}
				onToggle={(i) => setDraft({ ...draft, interests: toggled(draft.interests, i) })}
			/>
			{placing ?
				<div
					className="banner"
					role="status">
					<span>
						Click the map to place <strong>{placing.name}</strong>.
					</span>
					<button
						type="button"
						className="ghost"
						onClick={onCancelPlace}>
						Cancel
					</button>
				</div>
			:	<div className="row">
					<button
						type="submit"
						className="primary"
						disabled={!draft.name.trim()}>
						Place on map
					</button>
					<button
						type="button"
						className="ghost"
						onClick={onAddRandom}
						title="A made-up person, linked to one or two others">
						Add random person
					</button>
				</div>
			}
		</form>
	);
}

// --- edit the selected person ------------------------------------------------

function UserEditor({ user, users, adjacency, isSource, onUpdate, onRemove, onToggleEdge, onSetSource, onSelect }) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [pick, setPick] = useState("");
	const byId = Object.fromEntries(users.map((u) => [u.id, u]));
	const friends = [...adjacency[user.id]].map((id) => byId[id]).filter(Boolean);
	const addable = users.filter((u) => u.id !== user.id && !adjacency[user.id].has(u.id));

	return (
		<div className="editor">
			<h3>Edit {user.name.split(" ")[0]}</h3>
			<label>
				Name
				<input
					type="text"
					className="text"
					value={user.name}
					maxLength={40}
					onChange={(e) => onUpdate(user.id, { name: e.target.value })}
				/>
			</label>
			<DeptYear
				dept={user.dept}
				year={user.year}
				onChange={(patch) => onUpdate(user.id, patch)}
			/>
			<InterestChips
				label={`Interests of ${user.name}`}
				value={user.interests}
				onToggle={(i) => onUpdate(user.id, { interests: toggled(user.interests, i) })}
			/>

			<div className="muted">Friends ({friends.length})</div>
			<div className="chips">
				{friends.length === 0 && <span className="muted">None yet.</span>}
				{friends.map((f) => (
					<span
						key={f.id}
						className="chip friend-chip">
						<button
							type="button"
							className="chip-name"
							onClick={() => onSelect(f.id)}>
							{f.name.split(" ")[0]}
						</button>
						<button
							type="button"
							className="chip-x"
							aria-label={`Unfriend ${f.name}`}
							onClick={() => onToggleEdge(user.id, f.id)}>
							&times;
						</button>
					</span>
				))}
			</div>
			{addable.length > 0 && (
				<div className="row">
					<select
						aria-label={`Make ${user.name} friends with`}
						value={pick}
						onChange={(e) => setPick(e.target.value)}>
						<option value="">Make friends with...</option>
						{addable.map((u) => (
							<option
								key={u.id}
								value={u.id}>
								{u.name}
							</option>
						))}
					</select>
					<button
						type="button"
						className="ghost"
						disabled={!pick}
						onClick={() => {
							onToggleEdge(user.id, pick);
							setPick("");
						}}>
						Add friend
					</button>
				</div>
			)}

			<div className="row">
				<button
					type="button"
					className="ghost"
					disabled={isSource}
					onClick={() => onSetSource(user.id)}>
					{isSource ? "Current viewpoint" : "Use as viewpoint"}
				</button>
				{confirmDelete ?
					<button
						type="button"
						className="danger"
						onClick={() => onRemove(user.id)}>
						Really delete?
					</button>
				:	<button
						type="button"
						className="ghost"
						onClick={() => setConfirmDelete(true)}>
						Delete person
					</button>
				}
			</div>
		</div>
	);
}

// --- one possible friend -----------------------------------------------------

function hopLabel(hops) {
	if (hops === null) return "not connected";
	return hops === 2 ? "Friend of a friend" : `${hops} hops`;
}

function ResultCard({ r, algo, color, nameOf, selected, onSelect, onAddFriend }) {
	const { user, common } = r;
	const routeHops = r.route.length - 1;
	const winding = !r.direct && r.hops !== null && routeHops > r.hops;

	return (
		<li className={`card${selected ? " is-selected" : ""}`}>
			<button
				type="button"
				className="card-main"
				onClick={() => onSelect(user.id)}>
				<div className="card-top">
					<strong>{user.name}</strong>
					{algo === "score" ?
						<span className="score">{Math.round(r.score * 100)}</span>
					:	<span
							className="hop-tag"
							style={{ background: color }}>
							{hopLabel(r.hops)}
						</span>
					}
				</div>
				<div className="muted">
					{user.dept}, year {user.year}
				</div>
				<div className="route">
					{r.direct ?
						<>
							{nameOf(r.route[0])} <span aria-hidden="true">&rarr;</span> {user.name.split(" ")[0]}
							<span className="muted"> (nearby, no mutual friend)</span>
						</>
					:	r.route.map((id, i) => (
							<span key={`${id}-${i}`}>
								{i > 0 && <span aria-hidden="true"> &rarr; </span>}
								{nameOf(id)}
							</span>
						))
					}
				</div>
				{winding && (
					<div className="warn">
						This route takes {routeHops} hops; the shortest is {r.hops}.
					</div>
				)}
				{algo === "score" && (
					<>
						<div className="scorebar">
							{FACTORS.map((f) => (
								<span
									key={f.key}
									style={{ width: `${r.parts[f.key] * 100}%`, background: f.color }}
									title={`${f.label}: ${Math.round(r.parts[f.key] * 100)}`}
								/>
							))}
						</div>
						<div className="muted">{formatDistance(r.distance)} away</div>
					</>
				)}
				<div className="chips small">
					{common.interests.map((i) => (
						<span
							key={i}
							className="chip on">
							{i}
						</span>
					))}
					{common.sameDept && <span className="chip on">Same department</span>}
					{common.sameYear && <span className="chip on">Same year</span>}
				</div>
				{r.mutualNames.length > 0 && (
					<div className="mutual">
						Mutual: {r.mutualNames.slice(0, 2).join(", ")}
						{r.mutualNames.length > 2 ? ` +${r.mutualNames.length - 2}` : ""}
					</div>
				)}
			</button>
			<button
				type="button"
				className="add"
				onClick={() => onAddFriend(user.id)}>
				Add friend
			</button>
		</li>
	);
}

// --- the sidebar -------------------------------------------------------------

export default function InteractiveSidebar({
	users,
	adjacency,
	selected,
	onSelect,
	sourceId,
	onSetSource,
	placing,
	onStartPlace,
	onCancelPlace,
	onAddRandom,
	onUpdate,
	onRemove,
	onToggleEdge,
	onLoadDemo,
	onClear,
	algo,
	setAlgo,
	maxHops,
	setMaxHops,
	minCommon,
	setMinCommon,
	radiusM,
	setRadiusM,
	sortBy,
	setSortBy,
	showAll,
	setShowAll,
	search,
	step,
	total,
	onStep,
	playing,
	onPlay,
	onPause,
	speed,
	setSpeed,
	results,
	onAddFriend,
}) {
	const [confirmClear, setConfirmClear] = useState(false);
	const byId = Object.fromEntries(users.map((u) => [u.id, u]));
	const nameOf = (id) => (id === sourceId ? "You" : (byId[id]?.name.split(" ")[0] ?? "?"));
	const meta = ALGOS.find((a) => a.key === algo);
	const source = byId[sourceId];

	// What the algorithm just did, in words, for the step caption.
	let caption = "";
	const latest = search.visitOrder[Math.min(step, total) - 1];
	if (latest && latest !== sourceId) {
		const who = byId[latest]?.name.split(" ")[0];
		if (algo === "score") caption = `Rank ${Math.min(step, total) - 1}: ${who}`;
		else {
			const from = nameOf(search.parent.get(latest));
			caption =
				algo === "bfs" ?
					`Level ${search.shortest.get(latest)}: visit ${who}, reached from ${from}`
				:	`Go deeper: visit ${who}, reached from ${from}`;
		}
	} else if (latest) caption = `Start at ${source?.name.split(" ")[0]}`;

	return (
		<aside className="side">
			<header className="side-head">
				<h1>Campus friend finder</h1>
				<p className="muted">
					Interactive mode: build your own network, then watch BFS, DFS and the score recommender find friends.
				</p>
			</header>

			<section className="block">
				<h2>
					People <span className="count">{users.length}</span>
				</h2>

				<div className="row">
					<button
						type="button"
						className="ghost"
						onClick={onLoadDemo}>
						Load demo network
					</button>
					{confirmClear ?
						<button
							type="button"
							className="danger"
							onClick={() => {
								onClear();
								setConfirmClear(false);
							}}>
							Really clear all?
						</button>
					:	<button
							type="button"
							className="ghost"
							disabled={users.length === 0}
							onClick={() => setConfirmClear(true)}>
							Clear everyone
						</button>
					}
				</div>

				{users.length > 0 && (
					<div
						className="chips"
						aria-label="Everyone on the map">
						{users.map((u) => (
							<button
								type="button"
								key={u.id}
								className={`chip${u.id === selected?.id ? " on" : ""}${u.id === sourceId ? " is-start" : ""}`}
								aria-pressed={u.id === selected?.id}
								onClick={() => onSelect(u.id)}>
								{u.id === sourceId ? "★ " : ""}
								{u.name.split(" ")[0]}
							</button>
						))}
					</div>
				)}

				{selected && (
					<UserEditor
						key={selected.id}
						user={selected}
						users={users}
						adjacency={adjacency}
						isSource={selected.id === sourceId}
						onUpdate={onUpdate}
						onRemove={onRemove}
						onToggleEdge={onToggleEdge}
						onSetSource={onSetSource}
						onSelect={onSelect}
					/>
				)}

				<AddUserForm
					users={users}
					placing={placing}
					onStartPlace={onStartPlace}
					onCancelPlace={onCancelPlace}
					onAddRandom={onAddRandom}
				/>
				<p className="muted">
					Drag a person to move them. Use <strong>Connect friends</strong> on the map to link two people.
				</p>
			</section>

			<section className="block">
				<h2>Algorithm</h2>
				{users.length === 0 ?
					<p className="empty">Add a few people, or load the demo network, to run an algorithm.</p>
				:	<>
						<label>
							Find friends for
							<select
								value={sourceId ?? ""}
								onChange={(e) => onSetSource(e.target.value)}>
								{users.map((u) => (
									<option
										key={u.id}
										value={u.id}>
										{u.name}
									</option>
								))}
							</select>
						</label>

						<div
							className="seg"
							role="group"
							aria-label="Algorithm">
							{ALGOS.map((a) => (
								<button
									type="button"
									key={a.key}
									aria-pressed={algo === a.key}
									style={{ "--seg": a.color }}
									onClick={() => setAlgo(a.key)}>
									{a.label}
								</button>
							))}
						</div>
						<p className="muted blurb">{meta.blurb}</p>

						{algo === "score" ?
							<label className="range">
								<span>Within {radiusM} m</span>
								<input
									type="range"
									min="100"
									max="1500"
									step="50"
									value={radiusM}
									onChange={(e) => setRadiusM(Number(e.target.value))}
								/>
							</label>
						:	<label className="range">
								<span>
									Up to {maxHops} {maxHops === 1 ? "hop" : "hops"} away
									{maxHops === 2 ? " (friends of friends)" : ""}
								</span>
								<input
									type="range"
									min="1"
									max="6"
									value={maxHops}
									onChange={(e) => setMaxHops(Number(e.target.value))}
								/>
							</label>
						}
						<label className="range">
							<span>At least {minCommon} thing{minCommon === 1 ? "" : "s"} in common</span>
							<input
								type="range"
								min="0"
								max="4"
								value={minCommon}
								onChange={(e) => setMinCommon(Number(e.target.value))}
							/>
						</label>
						<div className="row">
							<label>
								Sort list by
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}>
									<option value="algo">{algo === "score" ? "Best score" : "Order found"}</option>
									<option value="common">Most in common</option>
								</select>
							</label>
							<label>
								Animation speed
								<select
									value={speed}
									onChange={(e) => setSpeed(e.target.value)}>
									<option value="slow">Slow</option>
									<option value="normal">Normal</option>
									<option value="fast">Fast</option>
								</select>
							</label>
						</div>
						<label className="toggle">
							<input
								type="checkbox"
								checked={showAll}
								onChange={(e) => setShowAll(e.target.checked)}
							/>
							Draw every route (not just the top 3)
						</label>

						<div className="stepper">
							<div className="row">
								<button
									type="button"
									className="primary"
									disabled={total < 2}
									onClick={playing ? onPause : onPlay}>
									{playing ? "Pause" : step >= total ? "Replay" : "Play"}
								</button>
								<button
									type="button"
									className="ghost"
									aria-label="Previous step"
									disabled={total < 2 || step <= 1}
									onClick={() => onStep(Math.max(1, Math.min(step, total) - 1))}>
									&lsaquo; Back
								</button>
								<button
									type="button"
									className="ghost"
									aria-label="Next step"
									disabled={total < 2 || step >= total}
									onClick={() => onStep(Math.min(total, step + 1))}>
									Next &rsaquo;
								</button>
							</div>
							<input
								type="range"
								aria-label="Algorithm step"
								min="1"
								max={Math.max(1, total)}
								value={Math.min(step, total) || 1}
								disabled={total < 2}
								onChange={(e) => onStep(Number(e.target.value))}
							/>
							<p
								className="muted"
								aria-live="polite">
								Step {Math.min(step, total)} of {total}
								{caption ? `: ${caption}` : ""}
							</p>
						</div>

						<div className="legend">
							<span>
								<i
									className="dot"
									style={{ background: "#3d3bc4" }}
								/>
								Start
							</span>
							<span>
								<i
									className="dot"
									style={{ background: "#64748b" }}
								/>
								Friend
							</span>
							<span>
								<i
									className="dot"
									style={{ background: meta.color }}
								/>
								Possible friend
							</span>
							<span>
								<i
									className="dot"
									style={{ background: "#e2e8f0", border: "1px solid #94a3b8" }}
								/>
								Visited, filtered out
							</span>
						</div>
					</>
				}
			</section>

			{users.length > 0 && (
				<section className="block grow">
					<h2>
						Possible friends <span className="count">{results.length}</span>
					</h2>
					{search.friendIds.size === 0 ?
						<p className="empty">
							{source?.name.split(" ")[0]} has no friends yet. Select the Connect friends tool and link them to
							someone.
						</p>
					: results.length === 0 ?
						<p className="empty">
							No one yet. Raise the hop limit, lower the in-common filter, or press Play to step through.
						</p>
					:	<ul className="cards">
							{results.map((r) => (
								<ResultCard
									key={r.user.id}
									r={r}
									algo={algo}
									color={meta.color}
									nameOf={nameOf}
									selected={r.user.id === selected?.id}
									onSelect={onSelect}
									onAddFriend={onAddFriend}
								/>
							))}
						</ul>
					}
				</section>
			)}
		</aside>
	);
}
