export type CellMark = "unknown" | "hit" | "miss";
export type Phase = "placement" | "battle" | "gameover";

export interface LogEntry {
  id: number;
  n: number; // turn number within its category
  who: "fire" | "prove" | "system";
  text: string;
  coord?: string;
  result?: "hit" | "miss";
  proveMs?: number;
  verifyMs?: number;
  verified?: boolean;
}
