// Real values. `full` is a real bound Figma variable (radius/full). `card`/`chip` are not bound as
// named tokens in Figma yet (still repeated literals there, per the punch list) - the values below
// are transcribed exactly as observed on real screens (Settings row-groups, Select Tuning rows,
// icon chips), which is what "pixel perfect" requires even though Figma hasn't named them.

export interface RadiusTokens {
  readonly full: number;
  readonly card: number;
  readonly chip: number;
}

export const radius: RadiusTokens = {
  full: 99999, // radius/full
  card: 24,
  chip: 10,
};
