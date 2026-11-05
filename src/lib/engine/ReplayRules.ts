import type { CampaignEvent, CampaignState } from "../../types/game-state";

export type RecordedEvent = Omit<CampaignEvent, "action"> & {
  action: string;
  fromId?: string | null;
  toId?: string | null;
  reason?: string | null;
  afterState: CampaignState;
  commentary?: { text?: string; source?: string; status?: string };
};

export class ReplayRules {
  static frame(events: readonly RecordedEvent[], revision: number, running: boolean) {
    const current = events.find(e => e.revision === revision);
    if (!current) return null;
    const before = events.filter(e => e.revision < revision).at(-1)?.afterState;
    const event = {
      ...current,
      fromId: current.fromId ?? before?.activeAttack?.attackerCountryId,
      toId: current.toId ?? before?.activeAttack?.defenderCountryId,
    };
    const canAnimate = !!(event.dice && event.fromId && event.toId);
    return {
      event, canAnimate,
      state: running && canAnimate ? before ?? current.afterState : current.afterState,
    };
  }

  static next(events: readonly RecordedEvent[], revision: number | null, end: number | null) {
    if (revision === null) return null;
    return events.find(e => e.revision > revision && (end === null || e.revision <= end))?.revision ?? null;
  }

  static latestAttack(events: readonly RecordedEvent[]) {
    const launches = events.filter(e => e.action === "start-attack");
    for (const launch of launches.slice().reverse()) {
      const following = events.filter(e => e.revision > launch.revision);
      const nextLaunch = following.find(e => e.action === "start-attack")?.revision ?? Infinity;
      const attack = following.filter(e => e.revision < nextLaunch);
      if (!attack.some(e => e.dice)) continue;
      const finish = attack.find(e => e.action === "stop-attack" ||
        e.action === "end-turn" || (!!e.dice && !e.afterState.activeAttack));
      return { start: launch.revision, end: finish?.revision ?? attack.at(-1)!.revision };
    }
    const lastRoll = events.filter(e => e.dice).at(-1);
    return lastRoll ? { start: lastRoll.revision, end: lastRoll.revision } : null;
  }
}
