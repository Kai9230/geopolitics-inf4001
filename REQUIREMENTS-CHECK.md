# GeoPolitics: brief and 56-mark rubric audit

Reviewed 6 November 2026 against the supplied UCT INF4001N Geopolitics entrance-exam brief and 2027 marksheet. Baseline: finalise.zip. This is implementation evidence, not an awarded or predicted mark.

## Current result

- All 35 automated tests pass (rules, simulations, API/repository authorization, guarded token recovery, commentary service, input and clipboard handlers).
- TypeScript, ESLint and the production build pass with non-secret placeholder browser configuration.
- There are no user Firebase Admin credentials or Groq keys in this review environment. Mocks establish application behaviour, not live provider connectivity.
- Browser visual inspection was attempted but the preview could not connect to the workspace server. Desktop/mobile layout and an end-to-end live game are not certified.
- No deployment, Firebase rule publication, database deletion, account creation, or assessor invitation was performed.

## Required gameplay and access

| Requirement | Source evidence and automated coverage | Remaining acceptance evidence |
|---|---|---|
| Single-player game against nine NPCs; exactly ten distinct countries | CampaignEngine.create; setup and catalogue-choice tests | Create a real campaign |
| Player chooses starting country; nine opponents and turn order randomized | Server catalogue and Fisher-Yates shuffle using crypto randomInt | Observe several new campaigns |
| Full starting army from the exact nine population brackets | BattleRules.soldiersFromPopulation; every boundary tested; server catalogue | Demonstrate starting values in UI |
| Multiple independent saved sessions | Lobby queries by verified UID; atomic creation, persistent campaigns | Create two games, reload and resume each |
| One attack per turn or skip; later exchanges stay against one target | CampaignEngine attackUsed/activeAttack guards; repeated-exchange and second-target tests | Demonstrate click flow |
| Transfers between owned countries before or after an attack, never during one | Engine ownership/attack guards; conservation and invalid-amount tests | Transfer in UI; verify source retains at least one |
| At least two soldiers to attack or continue | BattleRules/CampaignEngine; exhaustion tests | Show failed attack retains its territory |
| Each side rolls min(attacker soldiers minus one, defender soldiers) dice | Dice-count tests include 12 pairs; no three-dice cap | Verify all displayed pairs |
| Dice paired in original order; high roll wins; ties kill nobody | Exact PDF example and tie tests | Compare visible results with history |
| Stop attack ends turn and retains surviving army | stop-attack tests; stop intent waits for an in-flight exchange | Click Stop during an exchange |
| Conquest grants max(2, floor(original country soldier value / 2)) | conquestReward uses baseSoldiers; conquest tests | Observe reward and optional subsequent transfer |
| Newly owned country can attack on a later turn | attackUsed remains set after conquest | End turn and select it on next turn |
| From round two, two reinforcements per owned country; player allocates them | reinforcementTotal and exact-allocation tests; owned-country input form | Allocate across multiple countries |
| Eliminated players receive no turns; all ten countries under one owner wins | advanceTurn skips eliminated actors; victory tests; full strategic simulations at easy/normal/hard | Finish a real game; verify victory screen |
| All countries and soldier counts visible; no geographical attack restriction | Country cards, RiskMap, engine targets any enemy | Desktop/mobile visual check |
| Each battle shows attack, saved dice, casualties and outcome | RollingDice, MiniatureBattle, BattleEffects, authoritative event history | Observe a human battle and an NPC battle |
| Real LLM commentary describing unfolding battles | BattleCommentary calls Groq server-side after each saved dice exchange, validates a short sentence, leases to prevent duplicate calls; ready/fallback/error tests | REQUIRED: configure a real key and observe source=groq/status=ready and AI label. Fallback is not evidence of this requirement |
| Strategic NPC evaluates allocation, transfer, attack target, continuation and stopping | NpcStrategy scores strength/reward/elimination/treaties; reasons persisted per event; victory simulations | Read reasons at both playback speeds |
| Fast-forward speeds NPC moves but still shows gameplay and reasons | Fast controls 1x/2.5x; saved dice animation clock; decisions also in history | Confirm it waits when the human turn begins |
| Visitors can view shared links in real time but cannot play for owner | Firestore get/public events, owner-scoped list; all client writes denied; API verifies token including revocation; repository ownership checks tested | REQUIRED: signed-out visitor and separate account against the same live campaign |
| Visitors can sign up and start their own game | Firebase email/password login/register and lobby | Register a dedicated demonstration account |
| Appropriate web stack and NoSQL database | Next.js/React/TypeScript, Firebase Auth and Firestore | Live online connection |
| Deployed application | Node-compatible routes and production build ready | REQUIRED: deployment deferred at user's request |

The country catalogue records Worldometer as the population source. The 2026 source page was opened during review; sampled large-country values and South Africa match the catalogue. Stored values are a snapshot so existing games retain stable baseSoldiers.

## Exact rubric: fourteen criteria, four marks each

These are evidence targets for the assessor. No row is marked 4/4 here because marks depend on the demonstrated system and assessor judgment.

| Rubric criterion | Max | Implementation/evidence | Outstanding proof |
|---|---:|---|---|
| Database layer: separation, configuration, appropriateness, online database | 4 | CampaignRepository; firebase/admin and browser config; Firestore NoSQL; .env.example | Show the correct online Firebase project |
| Connection to database | 4 | Server repository, browser realtime snapshots | Real create/reload/resume; resolve any invalid credential error |
| Design of database | 4 | campaigns/{uuid} and events/{revision}; state+event atomic transaction; immutable dice, snapshot history, stored population provenance | Show representative saved documents and deployed rules |
| Coding structure/framework/best practices | 4 | App Router; typed presentation, client API, engine, repository and provider modules | Explain a command's path from UI to transaction |
| Object-oriented concepts: classes and encapsulation | 4 | CampaignEngine, BattleRules, NpcStrategy, CampaignRepository, DiplomacyRules and FlightLedger; private validation/state helpers | Walk through class responsibilities |
| Data validation, controls and security | 4 | Strict Zod schemas, body limit, safe integer guards, owner/turn checks, revisions, crypto dice, disabled and guarded forms | Browser invalid-input checks; live rules deny writes |
| Functionality | 4 | Core rule tests and three strategic win simulations | Complete a live campaign walkthrough |
| Correct operation: lists, searching, filtering, viewing | 4 | Search campaign ID/country/difficulty, filter active/completed, history select/replay, campaign cards | Demonstrate on multiple saved games |
| User interface | 4 | Globe login, world board, country cards, dice, miniatures, command controls, source labels, copy confirmation | Desktop/mobile visual review |
| Ease of navigation | 4 | Login, war room, field manual, game, replay return-to-live, result links | Keyboard and mobile walkthrough |
| Security: authentication and authorization | 4 | Revocation-checked token, derived UID, repository ownership, public read-only spectators; adversarial tests | Owner, other-account and signed-out live checks |
| Sophistication/complexity: battle/game engine, AI integration, access control | 4 | Transactional game engine, reasoned NPCs, real-time reconciliation, saved replay, provider leases, diplomacy | Demonstrate these together in running app |
| AI application | 4 | Groq generates one short report from saved facts; honest source label and factual fallback | REQUIRED: actual successful provider output |
| Overall evidence of effort | 4 | Custom graphics, multiple bonus features, tests, field manual, architecture and audit documents | Working public demo and complete submission |
| **Total possible** | **56** | **Implementation evidence is available across all criteria** | **Live and deployment evidence still required** |

## Bonus features already implemented

The brief asks for one extra feature, without a separate bonus-mark allocation in the supplied marksheet. More features do not automatically add marks.

1. Original map/battle animation, miniatures and 3D dice.
2. Saved battle and full-game replay.
3. Easy/normal/hard NPC strategies.
4. Per-campaign battle analytics and per-player multi-campaign totals.
5. Server dice, revision checks, persistent attack locks and ownership protection against cheating.
6. Temporary alliances, strategic acceptance/rejection, betrayal and reputation.
7. Shared real-time spectator view (also explicitly required by the access-control section).

NPC decisions use deterministic strategy, not an LLM. That is valid for the required NPC behaviour. The mandatory LLM use is battle commentary; do not claim the optional LLM-controlled NPC bonus.

## Changes made in this completion pass

- Share now shows `Link copied` beside the button and `Link copied ✓` on it only after a successful clipboard operation. A selected-text fallback supports older browsers; otherwise a manually selectable URL appears.
- SoldierInput remains wired into allocation and transfer. Leading zeros are normalized; the same numeric value still updates the displayed text. Submit handlers also reject invalid commands before sending them.
- Commentary now follows the displayed live or replay event rather than an independent latest-live listener. Late reports update the event shown; replay remains labelled Recorded frequency.
- Generated narrative is stored separately from the authoritative outcome instead of appending duplicate text to message.
- Client waits for Firebase auth readiness and refreshes only SESSION_EXPIRED once for the same account. Revoked sessions, provider failures and uncertain network mutations are never retried automatically.
- Restored API/repository authorization tests, plus commentary and control tests. npm test runs all four test files.
- Removed the unreferenced legacy GameEngine/GameRepository demo files and a commented-out duplicate route implementation. No game rules or existing database documents were migrated.
- Added a read-only server credential/Firestore diagnostic script and this detailed rubric map.

## Before deployment: execute and record

1. Keep your private .env.local and copy it into the completed source folder. Do not paste its contents into chat.
2. Run npm ci; npm test; npx tsc --noEmit; npm run lint; npm run build.
3. Run node scripts/check-services.mjs. All Firebase checks must PASS. A missing or invalid service account is an environment problem; refreshing user tokens cannot repair it.
4. Run npm start. Sign in and create two games. Reload, resume, filter and search. Only the owner should advance NPCs.
5. Play through a human attack; compare every saved die pair, loss and conquest reward. Test Stop, skip, transfers, reinforcement and eliminated turns.
6. Confirm a real battle displays AI war correspondent; inspect its saved commentary source/status. If only Battle report appears, fix the Groq key/model/network before claiming LLM completion.
7. Copy a game URL, open it signed out, and then as a different account. Both can view the board and history; neither can move or delete. Use the UI and denied API/browser-write checks as appropriate.
8. Replay a finished battle. Verify historical countries, saved dice and recorded commentary; return to live and confirm no new moves were submitted.
9. Check 1x/2.5x NPC speed, readable reasons, mobile layout, keyboard navigation, audio controls and centered delete dialog. Delete only a disposable test campaign when testing deletion.
10. Deploy only after the above checks, as a separate step. Then repeat auth, spectator and AI checks on the public URL.

## Submission requirements from the brief

- Source ZIP without .env.local, keys, node_modules, .next, caches, backups or obsolete updater scripts.
- Deployed URL (not created during this pass).
- Dedicated application demonstration username/password, supplied privately.
- Database access for ammarcanani@gmail.com, mc.tanner@uct.ac.za and ridewaan.hanslo@uct.ac.za, or the permitted database login alternative. Arrange appropriate access in the correct project; do not submit a service-account private key as a password. No invitations have been sent.
- README explaining setup and execution.
- Upload required files and access details to the INF4001 Amathuba assignment folder.

A successful local build is not proof of online authentication, a valid provider key, deployed Firestore rules, browser appearance, or 56/56 marks.
