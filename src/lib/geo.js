const EARTH_R = 6371000;
const M_PER_DEG_LAT = 111320;

const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

// Offsets are metres east (x) and north (y) of an anchor point.
export function offsetToLatLng(anchor, x, y) {
	return {
		lat: anchor.lat + y / M_PER_DEG_LAT,
		lng: anchor.lng + x / (M_PER_DEG_LAT * Math.cos(rad(anchor.lat))),
	};
}

export function formatDistance(m) {
	return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
