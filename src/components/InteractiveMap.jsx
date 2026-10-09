import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { CAMPUS } from "../config.js";

const EDGE_COLOR = "#94a3b8";

// --- small map helpers -------------------------------------------------------

function MapClicks({ onClick }) {
	useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
	return null;
}

function FlyToSelected({ target }) {
	const map = useMap();
	useEffect(() => {
		if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
		// Only fly when the selection changes, not every time someone is dragged.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target?.id]);
	return null;
}

// Re-frames the map whenever `fitKey` goes up (demo loaded, or "Fit all" pressed).
function FitToUsers({ points, fitKey }) {
	const map = useMap();
	useEffect(() => {
		if (!fitKey || points.length === 0) return;
		if (points.length === 1) {
			map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), CAMPUS.zoom));
			return;
		}
		map.fitBounds(
			points.map((p) => [p.lat, p.lng]),
			{ padding: [80, 80], maxZoom: 18 },
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fitKey]);
	return null;
}

// --- icons -------------------------------------------------------------------
// Names are typed by the tester and end up inside HTML, so they are escaped.

const esc = (s) =>
	String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Icons are cached so an unchanged marker is never given a new icon object.
const iconCache = new Map();
function cached(key, make) {
	let icon = iconCache.get(key);
	if (!icon) {
		if (iconCache.size > 600) iconCache.clear();
		icon = make();
		iconCache.set(key, icon);
	}
	return icon;
}

const pinIcon = (cls, badge, name, color) =>
	cached(
		`pin|${cls}|${badge}|${name}|${color}`,
		() =>
			L.divIcon({
				className: "u-wrap",
				html: `<div class="u-pin ${cls}" style="--c:${color}"><b>${esc(badge)}</b></div><span class="u-name">${esc(name)}</span>`,
				iconSize: [30, 30],
				iconAnchor: [15, 15],
			}),
	);

const arrowIcon = (deg, color) =>
	cached(
		`arrow|${deg}|${color}`,
		() =>
			L.divIcon({
				className: "route-arrow",
				html: `<svg viewBox="0 0 16 16" width="18" height="18" style="transform:rotate(${deg}deg)"><path d="M8 1 L14 14 L8 10.5 L2 14 Z" fill="${color}" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
				iconSize: [18, 18],
				iconAnchor: [9, 9],
			}),
	);

// Compass bearing (0 = north, clockwise) from a to b. Fine at campus scale.
function bearing(a, b) {
	const dx = (b.lng - a.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
	const dy = b.lat - a.lat;
	return (Math.atan2(dx, dy) * 180) / Math.PI;
}

// --- one drawn route ---------------------------------------------------------
// A line along the whole route with an arrowhead in the middle of every hop, so
// the direction (you -> friend -> possible friend) is obvious.

function Route({ route, positions, color, bold, direct }) {
	const pts = route.map((id) => positions[id]);
	if (pts.some((p) => !p)) return null;
	return (
		<>
			<Polyline
				positions={pts.map((p) => [p.lat, p.lng])}
				interactive={false}
				// Moving dashes show which way the route runs. className has to be a direct
				// prop: Leaflet only reads it when the line is created, not from pathOptions.
				className={direct ? undefined : "route-flow"}
				pathOptions={{
					color,
					weight: bold ? 6 : 4,
					opacity: bold ? 0.95 : 0.7,
					lineCap: "round",
					dashArray: direct ? "3 9" : "10 10",
				}}
			/>
			{pts.slice(1).map((p, i) => {
				const a = pts[i];
				const deg = Math.round(bearing(a, p) / 10) * 10;
				return (
					<Marker
						key={`${route[i]}>${route[i + 1]}`}
						position={{ lat: (a.lat + p.lat) / 2, lng: (a.lng + p.lng) / 2 }}
						icon={arrowIcon(deg, color)}
						interactive={false}
						keyboard={false}
						zIndexOffset={400}
					/>
				);
			})}
		</>
	);
}

// --- the map -----------------------------------------------------------------

export default function InteractiveMap({
	users,
	positions,
	edges,
	search,
	step,
	algo,
	color,
	sourceId,
	selectedId,
	connectFrom,
	tool,
	showAll,
	fitKey,
	onMapClick,
	onMarkerClick,
	onMove,
}) {
	const visitIndex = new Map(search.visitOrder.map((id, i) => [id, i]));
	const shown = search.results.filter((r) => r.index < step);
	const resultById = new Map(shown.map((r) => [r.user.id, r]));

	// Routes to draw: the top three (or all), and always the selected person.
	const toDraw = (showAll ? shown : shown.slice(0, 3)).map((r) => r.user.id);
	if (resultById.has(selectedId) && !toDraw.includes(selectedId)) toDraw.push(selectedId);

	const selectedPos = positions[selectedId] ? { id: selectedId, ...positions[selectedId] } : null;

	return (
		<MapContainer
			center={[CAMPUS.center.lat, CAMPUS.center.lng]}
			zoom={CAMPUS.zoom}
			className="map"
			zoomControl={false}>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				maxZoom={19}
			/>
			<ZoomControl position="bottomright" />
			<MapClicks onClick={onMapClick} />
			<FlyToSelected target={selectedPos} />
			<FitToUsers
				points={users.map((u) => positions[u.id])}
				fitKey={fitKey}
			/>

			{/* Every friendship, as a thin grey line */}
			{edges.map(([a, b]) =>
				positions[a] && positions[b] ?
					<Polyline
						key={`edge-${a}-${b}`}
						positions={[
							[positions[a].lat, positions[a].lng],
							[positions[b].lat, positions[b].lng],
						]}
						interactive={false}
						pathOptions={{ color: EDGE_COLOR, weight: 2, opacity: 0.6 }}
					/>
				:	null,
			)}

			{/* The search tree so far: the friendships the algorithm actually walked */}
			{search.treeEdges.slice(0, Math.max(0, step - 1)).map(([from, to]) =>
				positions[from] && positions[to] ?
					<Polyline
						key={`tree-${from}-${to}`}
						positions={[
							[positions[from].lat, positions[from].lng],
							[positions[to].lat, positions[to].lng],
						]}
						interactive={false}
						pathOptions={{ color, weight: 3.5, opacity: 0.55 }}
					/>
				:	null,
			)}

			{toDraw.map((id) => {
				const r = resultById.get(id);
				return (
					<Route
						key={`${algo}|${r.route.join(">")}|${r.direct}`}
						route={r.route}
						positions={positions}
						color={color}
						bold={id === selectedId}
						direct={r.direct}
					/>
				);
			})}

			{users.map((u) => {
				const pos = positions[u.id];
				if (!pos) return null;
				const idx = visitIndex.get(u.id);
				const seen = idx !== undefined && idx < step;
				const result = resultById.get(u.id);
				// Score mode ranks only candidates; BFS and DFS number everyone they visit.
				const numbered = algo !== "score" && seen && idx > 0;

				let cls = "is-idle";
				let badge = "";
				if (u.id === sourceId) {
					cls = "is-source";
					badge = "★";
				} else if (result) {
					cls = "is-cand";
					badge = String(idx);
				} else if (search.friendIds.has(u.id)) {
					cls = "is-friend";
					badge = numbered ? String(idx) : "";
				} else if (seen) {
					cls = "is-seen";
					badge = numbered ? String(idx) : "";
				}
				if (u.id === selectedId) cls += " is-selected";
				if (u.id === connectFrom) cls += " is-linking";

				return (
					<Marker
						key={u.id}
						position={pos}
						icon={pinIcon(cls, badge, u.name.split(" ")[0], color)}
						draggable={tool !== "connect"}
						zIndexOffset={u.id === sourceId ? 800 : result ? 500 : 0}
						eventHandlers={{
							click: () => onMarkerClick(u.id),
							dragend: (e) => {
								const p = e.target.getLatLng();
								onMove(u.id, { lat: p.lat, lng: p.lng });
							},
						}}>
						<Tooltip
							direction="top"
							offset={[0, -16]}>
							{u.name}, {u.dept}, year {u.year}
						</Tooltip>
					</Marker>
				);
			})}
		</MapContainer>
	);
}
