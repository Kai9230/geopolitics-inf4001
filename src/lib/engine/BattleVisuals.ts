import type { CampaignState } from "../../types/game-state";

export class FlightLedger {
  private readonly seen = new Set<string>();
  claim(exchange: string, session: string): boolean {
    const key = `${session}|${exchange}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value!);
    return true;
  }
}

export class FlightPlayback {
  private claimed = false;
  private permitted = false;
  private elapsed = 0;
  constructor(private readonly ledger: FlightLedger,
    private readonly exchange: string, private readonly session: string) {}
  sample(milliseconds: number) {
    if (!this.claimed) {
      this.permitted = this.ledger.claim(this.exchange, this.session);
      this.claimed = true;
    }
    // Rewinding a clock or repeating a saved exchange cannot launch another sortie.
    this.elapsed = Math.max(this.elapsed, Math.max(0, milliseconds));
    const ms = this.elapsed;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    return {
      flight: this.permitted,
      progress: clamp(ms / 1450),
      opacity: this.permitted ? clamp((ms - 30) / 100) * clamp((1800 - ms) / 180) : 0,
      bomb: this.permitted && ms >= 1400 && ms < 1800,
      bombProgress: clamp((ms - 1400) / 400),
      impact: clamp((ms - 1780) / 700),
      impactOpacity: ms >= 1780 ? 1 - clamp((ms - 1780) / 700) : 0,
    };
  }
}

export function attackVisualKey(state: Pick<CampaignState, "id" | "round" | "turnIndex">,
  from: string, to: string): string {
  return `${state.id}:${state.round}:${state.turnIndex}:${from}:${to}`;
}

export function exchangeVisualKey(state: Pick<CampaignState, "id" | "round" | "turnIndex">,
  from: string, to: string, revision: number): string {
  return `${attackVisualKey(state,from,to)}:exchange:${revision}`;
}
