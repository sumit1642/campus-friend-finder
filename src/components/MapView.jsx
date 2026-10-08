import { useEffect } from "react";
import {
	MapContainer,
	TileLayer,
	CircleMarker,
	Circle,
	Marker,
	Polyline,
	Tooltip,
	useMap,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { CAMPUS, WALK_SPEED_M_PER_MIN } from "../config.js";

const mePin = L.divIcon({
	className: "me-pin",
	html: "<span></span>",
	iconSize: [22, 22],
	iconAnchor: [11, 11],
});

function FlyToSelected({ target }) {
	const map = useMap();
	useEffect(() => {
		if (target) {
			map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
		}
		// Only re-fly when the selection changes, not on every live position update.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target?.id]);
	return null;
}

function Recenter({ center }) {
	const map = useMap();
	useEffect(() => {
		map.setView([center.lat, center.lng], CAMPUS.zoom);
	}, [center.lat, center.lng, map]);
	return null;
}

function ClickToMove({ onMove }) {
	useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) });
	return null;
}

export default function MapView({
	anchor,
	myPos,
	onMoveMe,
	students,
	friendIds,
	pendingIds,
	recs,
	radiusM,
	selectedId,
	onSelect,
}) {
	const top = recs.slice(0, 3);
	const topIds = new Set(top.map((r) => r.student.id));
	const recIds = new Set(recs.map((r) => r.student.id));
	const selected = students.find((s) => s.id === selectedId);

	return (
		<MapContainer
			center={[anchor.lat, anchor.lng]}
			zoom={CAMPUS.zoom}
			className="map"
			zoomControl={false}>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				maxZoom={19}
			/>
			<Recenter center={anchor} />
			<FlyToSelected target={selected} />
			<ClickToMove onMove={onMoveMe} />

			{/* Walking-distance rings around you */}
			{[1 / 3, 2 / 3, 1].map((f, i) => (
				<Circle
					key={f}
					center={[myPos.lat, myPos.lng]}
					radius={radiusM * f}
					interactive={false}
					pathOptions={{
						color: "#3d3bc4",
						weight: i === 2 ? 1.5 : 1,
						dashArray: i === 2 ? undefined : "4 6",
						fillColor: "#3d3bc4",
						fillOpacity: i === 2 ? 0.04 : 0,
						opacity: i === 2 ? 0.55 : 0.3,
					}}
				/>
			))}

			{/* Lines to the three best matches */}
			{top.map((r) => (
				<Polyline
					key={`line-${r.student.id}`}
					positions={[
						[myPos.lat, myPos.lng],
						[r.student.lat, r.student.lng],
					]}
					interactive={false}
					pathOptions={{ color: "#0e9aa7", weight: 2, dashArray: "2 7", opacity: 0.9 }}
				/>
			))}

			{students.map((s) => {
				const isFriend = friendIds.has(s.id);
				const isPending = pendingIds.has(s.id);
				const isTop = topIds.has(s.id);
				const isRec = recIds.has(s.id);
				const isSelected = s.id === selectedId;

				let style = { color: "#9aa4b2", fillColor: "#c9d0da", fillOpacity: 0.7, radius: 5, weight: 1 };
				if (isFriend)
					style = { color: "#334155", fillColor: "#64748b", fillOpacity: 1, radius: 6, weight: 1.5 };
				else if (isPending)
					style = { color: "#64748b", fillColor: "#ffffff", fillOpacity: 1, radius: 6, weight: 2 };
				else if (isTop)
					style = { color: "#ffffff", fillColor: "#0e9aa7", fillOpacity: 1, radius: 9, weight: 2 };
				else if (isRec)
					style = { color: "#0e9aa7", fillColor: "#7ccfd6", fillOpacity: 0.9, radius: 6, weight: 1.5 };
				if (isSelected) style = { ...style, color: "#e0a100", weight: 3, radius: style.radius + 2 };

				const rec = isTop ? top.find((r) => r.student.id === s.id) : null;
				return (
					<CircleMarker
						key={s.id}
						center={[s.lat, s.lng]}
						radius={style.radius}
						bubblingMouseEvents={false}
						pathOptions={style}
						eventHandlers={{ click: () => onSelect(s.id) }}>
						{rec ?
							<Tooltip
								permanent
								direction="top"
								offset={[0, -8]}
								className="rec-tip">
								{s.name.split(" ")[0]}, {Math.max(1, Math.round(rec.distance / WALK_SPEED_M_PER_MIN))}{" "}
								min
							</Tooltip>
						:	<Tooltip
								direction="top"
								offset={[0, -6]}>
								{s.name}
								{isFriend ? " (friend)" : ""}
							</Tooltip>
						}
					</CircleMarker>
				);
			})}

			<Marker
				position={[myPos.lat, myPos.lng]}
				icon={mePin}
				draggable
				zIndexOffset={1000}
				eventHandlers={{
					dragend: (e) => {
						const p = e.target.getLatLng();
						onMoveMe({ lat: p.lat, lng: p.lng });
					},
				}}>
				<Tooltip
					direction="top"
					offset={[0, -10]}>
					You (drag to move)
				</Tooltip>
			</Marker>
		</MapContainer>
	);
}
