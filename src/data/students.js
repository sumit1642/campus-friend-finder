import { CAMPUS } from "../config.js";

export const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Management", "Biotechnology", "Design"];

export const INTERESTS = [
	"Coding",
	"Music",
	"Football",
	"Cricket",
	"Photography",
	"Anime",
	"Hiking",
	"Gaming",
	"Reading",
	"Dance",
	"Startups",
	"Chess",
	"Cooking",
	"Film",
];

const FIRST = [
	"Aarav",
	"Ananya",
	"Vivaan",
	"Diya",
	"Reyansh",
	"Isha",
	"Kabir",
	"Meera",
	"Arjun",
	"Saanvi",
	"Rohan",
	"Tara",
	"Aditya",
	"Nisha",
	"Dev",
	"Riya",
	"Karan",
	"Pooja",
	"Ishaan",
	"Kavya",
	"Yash",
	"Anika",
	"Veer",
	"Sneha",
	"Harsh",
	"Naina",
	"Manav",
	"Aditi",
	"Neel",
	"Simran",
	"Raj",
	"Palak",
	"Tejas",
	"Mahi",
	"Samar",
	"Zoya",
];
const LAST = [
	"Sharma",
	"Rawat",
	"Negi",
	"Bisht",
	"Kapoor",
	"Joshi",
	"Thakur",
	"Gupta",
	"Verma",
	"Bhatt",
	"Chauhan",
	"Mehta",
	"Singh",
	"Panwar",
	"Nautiyal",
];

// Small seeded PRNG so every reload shows the same campus.
function mulberry32(seed) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function makeStudents(count = FIRST.length) {
	const rnd = mulberry32(42);
	const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
	const R = CAMPUS.simulationRadiusM;

	const students = Array.from({ length: count }, (_, i) => {
		const angle = rnd() * Math.PI * 2;
		const r = R * Math.sqrt(rnd());
		const interests = new Set();
		const wanted = 3 + Math.floor(rnd() * 2);
		while (interests.size < wanted) interests.add(pick(INTERESTS));
		return {
			id: `s${i}`,
			name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
			dept: pick(DEPARTMENTS),
			year: 1 + Math.floor(rnd() * 4),
			interests: [...interests],
			x: Math.cos(angle) * r,
			y: Math.sin(angle) * r,
			h: rnd() * Math.PI * 2,
			speed: 0.6 + rnd() * 0.8, // metres per second
		};
	});

	// Friendship graph: mostly inside a department, a few across departments.
	const adjacency = Object.fromEntries(students.map((s) => [s.id, new Set()]));
	const link = (a, b) => {
		if (a.id === b.id) return;
		adjacency[a.id].add(b.id);
		adjacency[b.id].add(a.id);
	};
	for (const s of students) {
		const sameDept = students.filter((o) => o.dept === s.dept && o.id !== s.id);
		for (let k = 0; k < 2 && sameDept.length; k++) link(s, pick(sameDept));
		link(s, pick(students));
	}
	return { students, adjacency };
}

export const INITIAL_FRIEND_IDS = ["s2", "s9", "s17", "s24"];
