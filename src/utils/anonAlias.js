const ANIMALS = [
  "Owl", "Fox", "Bear", "Wolf", "Deer", "Hawk", "Lynx", "Seal",
  "Crow", "Dove", "Frog", "Hare", "Lion", "Mole", "Puma", "Swan",
  "Toad", "Vole", "Wren", "Yak", "Orca", "Newt", "Ibis", "Kiwi",
  "Moth", "Pike", "Ram", "Tern", "Wasp", "Crab",
];

/**
 * Get or create a persistent anonymous alias for a subject.
 * Format: "Owl #12" — unique per subject, stored in localStorage.
 */
export function getOrCreateAlias(subjectId) {
  const key = `bunksmart_alias_${subjectId}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;

  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  const alias = `${animal} #${num}`;

  localStorage.setItem(key, alias);
  return alias;
}

/**
 * Get the alias for a subject without creating one.
 */
export function getAlias(subjectId) {
  const key = `bunksmart_alias_${subjectId}`;
  return localStorage.getItem(key) || null;
}
