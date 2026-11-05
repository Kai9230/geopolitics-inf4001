# Requirements evidence and final verification

This is a source audit checklist, not a guarantee of marks. Local tests verify
rules and presentation logic; the deployed system needs the live checks below.

| Brief requirement | Implementation evidence |
|---|---|
| Single player, exactly ten countries, random opponents/order | CampaignEngine.create; population/setup tests |
| Population brackets and full starting armies | BattleRules.soldiersFromPopulation; boundary tests |
| One attack per turn, locked target, repeated exchanges | CampaignEngine; attack-lock and stop/exhaustion tests |
| Both sides min(attacker - 1, defender) dice; original pair order; ties no loss | BattleRules; dice tests; no Risk three-dice cap |
| Original-value conquest reward and next-turn new attack | CampaignEngine; conquest test |
| Owned-country transfers; retain one; none during attack | CampaignEngine; transfer validation tests |
| Round-two reinforcement and elimination | CampaignEngine; reinforcement/elimination tests |
| All ten countries conquered wins | CampaignEngine and CampaignExperience victory overlay; win simulations |
| Visible armies, any-distance attack, country clicks | RiskMap and CampaignExperience; live UI check required |
| Reasoned NPC actions, allocations, transfers, stopping | NpcStrategy; simulations at all difficulties |
| Fast-forward still shows decisions | CampaignExperience and BattleClock; verify live at 1x/2.5x |
| Visible battles/dice/losses/outcomes | BattleEffects, RollingDice, miniatures and history; visual check required |
| Dynamic LLM commentary | BattleCommentary and API; live AI-labelled response required |
| Public spectators, owner-only moves | Firestore rules, verified API tokens, repository owner check; two-account live check |
| Multiple saved campaigns | Lobby and CampaignRepository; live create/resume/delete check |
| NoSQL and deployment | Firestore implementation; deployed URL and online configuration required |

## Rubric evidence

| Area | Evidence to demonstrate |
|---|---|
| Separate database layer/configuration/appropriateness/online | CampaignRepository, firebase/admin, env configuration; show online Firestore |
| Database connection | Create a real campaign, reload it and show its saved document |
| Database design | campaigns/{id} plus immutable events/{revision}; state snapshots and indexes |
| Framework and coding structure | Next.js App Router; typed components, routes, engine and repository separation |
| Classes and encapsulation | CampaignEngine, BattleRules, CampaignRepository private helpers, FlightLedger private state |
| Validation/controls/security | Zod API parsing, engine guards, verified tokens, revisions, server dice and denied browser writes |
| Functionality | Rule regression tests plus full live game walkthrough |
| Lists/search/filter/view | Lobby campaign list, country search/difficulty controls and campaign history; demonstrate actual UI |
| User interface/navigation | Login globe, war room, field manual, interactive map, dialogs; review desktop/mobile |
| Authentication/authorization | Signed-out read-only spectator, owner commands, second-account rejection |
| Sophistication | Battle engine, reasoned NPCs, replay, transactions and realtime presentation |
| AI application | Working Groq-generated commentary labelled AI; fallback alone is insufficient |
| Overall effort | Original UI/miniatures, tests, documentation, architecture and bonus demonstrations |

## Live acceptance checklist before submission

- [ ] Production build deployed and reachable by shared URL.
- [ ] Firebase rules/indexes deployed to the correct project.
- [ ] Sign-up/login/logout work; only owner can move, advance NPCs or delete.
- [ ] A second account cannot mutate somebody else's campaign.
- [ ] Signed-out shared link shows realtime board/history without play controls.
- [ ] New battle produces actual AI-labelled commentary with no client secret exposure.
- [ ] One plane flight per genuine dice exchange, no flight for duplicate notifications, and independent fresh replay flights.
- [ ] Replay displays historical boards, dice, casualties and outcomes; live state is unchanged.
- [ ] Default speed 1x; 2.5x NPC playback remains visible with reasons.
- [ ] Allocation, transfer, stop, defeat, conquest and victory work in the browser.
- [ ] Diplomacy acceptance/rejection, expiry, betrayal and reputation display correctly.
- [ ] Delete confirmation is centred and deletion removes campaign/history.
- [ ] Music follows login/war room/game and persistent mute; keyboard/mobile controls work.
- [ ] Dedicated application demo credentials and required assessor database access arranged privately.
- [ ] Source ZIP, README, deployed URL and submission materials uploaded to Amathuba.

The automated suite does not establish animation appearance, live provider uptime,
Firestore rule deployment or assessor permissions. Record these checks separately.
