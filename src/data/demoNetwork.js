import { CAMPUS } from "../config.js";
import { offsetToLatLng } from "../lib/geo.js";

// A small hand-made network for presenting. It is built so the algorithms
// visibly disagree: from Aarav, BFS reaches Arjun in 2 hops (via Kabir), while
// DFS wanders Diya > Meera > Rohan > Tara > Kabir > Arjun (6 hops).
// x / y are metres east / north of the campus centre.
const PEOPLE = [
	{ name: "Aarav Sharma", dept: "Computer Science", year: 2, interests: ["Coding", "Music", "Football"], x: 0, y: 0 },
	{ name: "Diya Rawat", dept: "Computer Science", year: 2, interests: ["Coding", "Chess", "Reading"], x: -110, y: 90 },
	{ name: "Kabir Negi", dept: "Electronics", year: 3, interests: ["Music", "Gaming", "Football"], x: 100, y: -60 },
	{ name: "Meera Bisht", dept: "Computer Science", year: 3, interests: ["Coding", "Photography", "Hiking"], x: -230, y: 40 },
	{ name: "Rohan Kapoor", dept: "Mechanical", year: 2, interests: ["Football", "Cricket", "Gaming"], x: -120, y: -140 },
	{ name: "Tara Joshi", dept: "Design", year: 1, interests: ["Music", "Photography", "Film"], x: 20, y: -170 },
	{ name: "Isha Thakur", dept: "Design", year: 2, interests: ["Photography", "Film", "Dance"], x: 150, y: -200 },
	{ name: "Arjun Gupta", dept: "Management", year: 3, interests: ["Startups", "Football", "Chess"], x: 230, y: 10 },
	{ name: "Saanvi Verma", dept: "Biotechnology", year: 2, interests: ["Reading", "Hiking", "Cooking"], x: -30, y: 200 },
	{ name: "Dev Bhatt", dept: "Computer Science", year: 4, interests: ["Coding", "Startups", "Gaming"], x: -230, y: 150 },
];

// 1-based positions in PEOPLE.
const LINKS = [
	[1, 2],
	[1, 3],
	[2, 4],
	[2, 9],
	[4, 5],
	[4, 10],
	[9, 10],
	[5, 6],
	[3, 6],
	[6, 7],
	[3, 8],
];

export function makeDemoNetwork() {
	const id = (n) => `u${n}`;
	return {
		users: PEOPLE.map((p, i) => ({
			id: id(i + 1),
			name: p.name,
			dept: p.dept,
			year: p.year,
			interests: p.interests,
		})),
		pos: Object.fromEntries(PEOPLE.map((p, i) => [id(i + 1), offsetToLatLng(CAMPUS.center, p.x, p.y)])),
		edges: LINKS.map(([a, b]) => [id(a), id(b)]),
		nextId: PEOPLE.length + 1,
	};
}
