// Change CAMPUS.center to your own campus (right-click a spot in
// openstreetmap.org -> "Show address" gives you the lat/lng).
export const CAMPUS = {
	name: "Campus",
	center: { lat: 30.2736, lng: 77.9998 },
	zoom: 17,
	// Simulated students stay inside this radius (metres) around the campus centre.
	simulationRadiusM: 450,
};

export const WALK_SPEED_M_PER_MIN = 80;
export const TICK_MS = 1000;
// 1 real second = this many seconds of walking, so movement is visible on screen.
export const TIME_LAPSE = 6;
