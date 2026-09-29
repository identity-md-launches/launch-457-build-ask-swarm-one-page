export const ANSWERS = [
  'The swarm says yes.',
  'Absolutely not.',
  'All agents agree: do it.',
  'The swarm is divided. Ask again.',
  'Signs point to yes.',
  "Don't count on it.",
  'Consensus reached: no.',
  'Too early to tell. The swarm is still thinking.',
  'Without a doubt.',
  'Ask again after the next block.',
] as const;

// One equal-sized random interval per eligible answer, skipping the last index.
// First draw: 1/10 each. Subsequent draws: 1/9 each, excluding the last answer.
export function pickAnswer(previous = -1, random: () => number = Math.random): number {
  const hasPrevious = previous >= 0 && previous < ANSWERS.length;
  const draw = Math.floor(random() * (ANSWERS.length - Number(hasPrevious)));
  return hasPrevious && draw >= previous ? draw + 1 : draw;
}
