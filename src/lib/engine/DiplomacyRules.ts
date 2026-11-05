import type { CampaignState } from "../../types/game-state";

export class DiplomacyRules {
  static reputation(state: CampaignState, actor: string): number {
    const value = state.reputation?.[actor];
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : 50;
  }
  private static change(state: CampaignState, actor: string, amount: number) {
    state.reputation = { ...state.reputation, [actor]: Math.max(0,Math.min(100,this.reputation(state,actor)+amount)) };
  }
  static expire(state: CampaignState) {
    for (const treaty of state.treaties ?? []) {
      if (treaty.expiresRound < state.round) for (const actor of treaty.members) this.change(state,actor,5);
    }
    state.treaties = (state.treaties ?? []).filter(t => t.expiresRound >= state.round);
  }
  static active(state: CampaignState, a: string, b: string) {
    return (state.treaties ?? []).find(t => t.expiresRound >= state.round && t.members.includes(a) && t.members.includes(b));
  }
  static evaluate(state: CampaignState, actor: string, target: string) {
    const strength = (id: string) => state.countries.filter(c => c.ownerId === id).reduce((n,c) => n+c.soldiers,0);
    const mine = strength(actor), theirs = strength(target);
    const rival = state.participants.filter(p => p.id !== actor && p.id !== target)
      .map(p => ({ id: p.id, name: p.name, strength: strength(p.id) }))
      .sort((a,b) => b.strength-a.strength)[0];
    const trust = this.reputation(state,actor);
    const commonThreat = !!rival && rival.strength > theirs;
    const accepted = trust >= 25 && (trust-50+(mine>=theirs ? 25 : 0)+(commonThreat ? 30 : 0)) >= 20;
    const reason = trust < 25 ? "Recent betrayals make this proposal untrustworthy."
      : accepted ? commonThreat ? `Cooperation offers deterrence against ${rival.name}.` : "Your army offers useful deterrence."
      : "The balance of power and current trust do not justify an alliance.";
    return { accepted, reason, trust, sharedRivalId: commonThreat ? rival.id : null };
  }
  static offer(state: CampaignState, actor: string, target: string): string {
    if (this.active(state,actor,target)) throw new Error("A treaty already exists.");
    const proposal = this.evaluate(state,actor,target);
    const name = state.participants.find(p => p.id === target)!.name;
    if (!proposal.accepted) return `${name} rejects the offer. ${proposal.reason}`;
    state.treaties ??= [];
    state.treaties.push({ members:[actor,target], expiresRound:state.round+1,
      formedRound:state.round, sharedRivalId:proposal.sharedRivalId });
    return `${name} accepts an alliance through round ${state.round+1}. ${proposal.reason}`;
  }
  static end(state: CampaignState, actor: string, target: string, betrayal: boolean): boolean {
    const treaty = this.active(state,actor,target);
    if (!treaty) return false;
    state.treaties = (state.treaties ?? []).filter(t => t !== treaty);
    this.change(state,actor,betrayal ? -25 : -5);
    return true;
  }
}
