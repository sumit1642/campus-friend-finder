import { DEPARTMENTS, INTERESTS } from "./students.js";

const NAMES = [
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
];

/** A first name nobody on the map has yet, so new users start with a sensible label. */
export function suggestName(users) {
	const used = new Set(users.map((u) => u.name.split(" ")[0].toLowerCase()));
	const free = NAMES.find((n) => !used.has(n.toLowerCase()));
	return free ?? `Student ${users.length + 1}`;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** A made-up profile, for the "add random person" shortcut. */
export function randomProfile(users) {
	const interests = new Set();
	const wanted = 3 + Math.floor(Math.random() * 2);
	while (interests.size < wanted) interests.add(pick(INTERESTS));
	return {
		name: suggestName(users),
		dept: pick(DEPARTMENTS),
		year: 1 + Math.floor(Math.random() * 4),
		interests: [...interests],
	};
}
