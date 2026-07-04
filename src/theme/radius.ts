// Shape only - no values. Figma uses a real `radius/full` variable in some places and raw 999px /
// 9999px literals for the identical intent elsewhere, plus two more radii (24px "card", 10px
// "chip") that exist only as repeated literals, never as named tokens. Which numbers ultimately
// win is a Figma decision (see the UI spec's punch list), not this file's job.

export interface RadiusTokens {
  readonly full: number; // pill/circular radius - effectively "as round as the box allows"
  readonly card: number; // rounded containers: settings row-groups, tuning rows
  readonly chip: number; // small icon/note chips
}
