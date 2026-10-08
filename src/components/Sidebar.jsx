import { useState } from "react";
import { DEPARTMENTS, INTERESTS } from "../data/students.js";
import { FACTORS, DEFAULT_WEIGHTS } from "../lib/recommender.js";
import { formatDistance } from "../lib/geo.js";
import { WALK_SPEED_M_PER_MIN } from "../config.js";

function ScoreBar({ parts }) {
	return (
		<div
			className="scorebar"
			role="img"
			aria-label="Score breakdown">
			{FACTORS.map((f) => (
				<span
					key={f.key}
					style={{ width: `${parts[f.key] * 100}%`, background: f.color }}
					title={`${f.label}: ${Math.round(parts[f.key] * 100)}`}
				/>
			))}
		</div>
	);
}

function RecCard({ rec, selected, onSelect, onAdd }) {
	const { student: s } = rec;
	const mins = Math.max(1, Math.round(rec.distance / WALK_SPEED_M_PER_MIN));
	return (
		<li className={`card${selected ? " is-selected" : ""}`}>
			<button
				type="button"
				className="card-main"
				onClick={() => onSelect(s.id)}>
				<div className="card-top">
					<strong>{s.name}</strong>
					<span className="score">{Math.round(rec.score * 100)}</span>
				</div>
				<div className="muted">
					{s.dept}, year {s.year}
				</div>
				<div className="muted">
					{formatDistance(rec.distance)} away, about {mins} min walk
				</div>
				<ScoreBar parts={rec.parts} />
				{rec.mutualNames.length > 0 && (
					<div className="mutual">
						Mutual: {rec.mutualNames.slice(0, 2).join(", ")}
						{rec.mutualNames.length > 2 ? ` +${rec.mutualNames.length - 2}` : ""}
					</div>
				)}
				{rec.sharedInterests.length > 0 && (
					<div className="chips small">
						{rec.sharedInterests.map((i) => (
							<span
								key={i}
								className="chip on">
								{i}
							</span>
						))}
					</div>
				)}
			</button>
			<button
				type="button"
				className="add"
				onClick={() => onAdd(s.id)}>
				Add friend
			</button>
		</li>
	);
}

export default function Sidebar({
	me,
	setMe,
	radiusM,
	setRadiusM,
	weights,
	setWeights,
	live,
	setLive,
	recs,
	friendCount,
	pendingCount,
	selectedId,
	onSelect,
	onAdd,
	onUseGps,
	onReset,
	gpsError,
}) {
	const [showWeights, setShowWeights] = useState(false);
	const toggleInterest = (i) =>
		setMe((m) => ({
			...m,
			interests: m.interests.includes(i) ? m.interests.filter((x) => x !== i) : [...m.interests, i],
		}));

	return (
		<aside className="side">
			<header className="side-head">
				<h1>Campus friend finder</h1>
				<p className="muted">Students near you, ranked by distance, mutual friends and shared interests.</p>
			</header>

			<section className="block">
				<h2>You</h2>
				<div className="row">
					<label>
						Department
						<select
							value={me.dept}
							onChange={(e) => setMe({ ...me, dept: e.target.value })}>
							{DEPARTMENTS.map((d) => (
								<option key={d}>{d}</option>
							))}
						</select>
					</label>
					<label>
						Year
						<select
							value={me.year}
							onChange={(e) => setMe({ ...me, year: Number(e.target.value) })}>
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
				<div
					className="chips"
					aria-label="Your interests">
					{INTERESTS.map((i) => (
						<button
							type="button"
							key={i}
							className={`chip${me.interests.includes(i) ? " on" : ""}`}
							aria-pressed={me.interests.includes(i)}
							onClick={() => toggleInterest(i)}>
							{i}
						</button>
					))}
				</div>
				<p className="muted">
					{friendCount} friends{pendingCount ? `, ${pendingCount} request sent` : ""}. Click the map or drag
					the blue pin to move yourself.
				</p>
				<div className="row">
					<button
						type="button"
						className="ghost"
						onClick={onUseGps}>
						Use my location
					</button>
					<button
						type="button"
						className="ghost"
						onClick={onReset}>
						Back to campus
					</button>
				</div>
				{gpsError && <p className="error">{gpsError}</p>}
			</section>

			<section className="block">
				<h2>Search</h2>
				<label className="range">
					<span>Within {radiusM} m</span>
					<input
						type="range"
						min="100"
						max="600"
						step="50"
						value={radiusM}
						onChange={(e) => setRadiusM(Number(e.target.value))}
					/>
				</label>
				<label className="toggle">
					<input
						type="checkbox"
						checked={live}
						onChange={(e) => setLive(e.target.checked)}
					/>
					Students are moving (simulated)
				</label>
				<button
					type="button"
					className="link"
					onClick={() => setShowWeights((v) => !v)}>
					{showWeights ? "Hide ranking weights" : "Adjust ranking weights"}
				</button>
				{showWeights && (
					<div className="weights">
						{FACTORS.map((f) => (
							<label
								className="range"
								key={f.key}>
								<span>
									<i
										className="dot"
										style={{ background: f.color }}
									/>{" "}
									{f.label}: {weights[f.key]}
								</span>
								<input
									type="range"
									min="0"
									max="100"
									value={weights[f.key]}
									onChange={(e) => setWeights({ ...weights, [f.key]: Number(e.target.value) })}
								/>
							</label>
						))}
						<button
							type="button"
							className="link"
							onClick={() => setWeights(DEFAULT_WEIGHTS)}>
							Reset weights
						</button>
					</div>
				)}
			</section>

			<section className="block grow">
				<h2>
					Suggested friends <span className="count">{recs.length}</span>
				</h2>
				<div className="legend">
					{FACTORS.map((f) => (
						<span key={f.key}>
							<i
								className="dot"
								style={{ background: f.color }}
							/>
							{f.label}
						</span>
					))}
				</div>
				{recs.length === 0 ?
					<p className="empty">No one in range. Widen the search radius or move the pin.</p>
				:	<ul className="cards">
						{recs.map((r) => (
							<RecCard
								key={r.student.id}
								rec={r}
								selected={r.student.id === selectedId}
								onSelect={onSelect}
								onAdd={onAdd}
							/>
						))}
					</ul>
				}
			</section>
		</aside>
	);
}
