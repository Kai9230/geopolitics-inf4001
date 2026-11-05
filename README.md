# GeoPolitics

Single-player web game using Next.js, React, TypeScript, Firebase Authentication,
Cloud Firestore (NoSQL), and server-side Groq battle commentary.

## Run locally

1. Install Node.js 22 or newer and run `npm ci` in the project folder.
2. Preserve `.env.local`. Configure the Firebase browser values and server-only
   Firebase Admin credentials shown in `.env.example`. Never put Admin or Groq
   secrets in variables beginning NEXT_PUBLIC_.
3. Enable Firebase Email/Password Authentication and Firestore.
4. Sign in to the Firebase CLI and deploy the project rules and indexes:
   `npx firebase-tools login`
   `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`
   The rules source is `src/lib/api/firestore.rules`; firebase.json selects it.
5. Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`.
6. Run `npm run dev` for editing, or `npm start` after a successful build to assess
   production performance. Open http://localhost:3000.
7. Configure GROQ_API_KEY on the server. Verify a new battle produces AI-labelled
   commentary. A labelled fallback keeps gameplay available but does not prove
   the required LLM integration works.

## Play

Choose one country; nine other countries are randomly selected. Exactly ten
countries participate. Allocate reinforcements when prompted, select an owned
country with at least two soldiers, then click an enemy to begin your one attack.
Multiple dice exchanges are phases of that attack, not extra attacks. Each new
saved exchange may show a plane flight; duplicate events do not restart it. Stop ends the turn; conquest permits transfers
before ending the turn. Round two onward grants two soldiers per owned country.
The field manual documents dice, conquest, transfers, spectators and diplomacy.
Default playback is 1x; the owner may accelerate NPC presentation to 2.5x.
Replay uses saved states and dice and never changes the live campaign.

## Architecture and security

CampaignEngine, BattleRules and DiplomacyRules contain rules. NpcStrategy makes
reasoned choices. CampaignRepository encapsulates Firestore transactions and
owns database mutations; API routes verify identity and validate commands.
The browser renders confirmed results and cannot directly write game documents.
Server crypto generates dice; ownership, revisions, turn and attack locks prevent
unauthorized moves and duplicate application. Public campaign links intentionally
expose the board and battle history for spectators. Do not store secrets there.
Keep environment credentials out of source submissions.

## Bonus features

1. Animated map, dice and original 3D miniatures.
2. Recorded battle and full-game replay.
3. NPC difficulty levels.
4. Campaign/player analytics.
5. Persistent attacks, server dice and revision checks against cheating.
6. Strategic temporary alliances, diplomacy and reputation.
7. Public realtime spectator links.

Diplomacy is optional: treaties influence target selection, can be broken, and
never change base dice rules, troop values, the attack limit or solo victory.
Honouring expiry adds five reputation; ending early costs five; betrayal costs 25.

## Performance

Campaign creation uses atomic batch creation. Confirmed API results update the
presentation immediately; listeners reconcile saved state. Battle visuals use
one shared clock without resetting the whole SVG timeline. Flights are deduplicated
by exchange and replay session; streaming audio preloads metadata. Authentication,
revocation, ownership checks and transactional game updates remain enabled.
Use production mode and inspect Server-Timing to measure auth/database latency.
Actual database region, network and provider latency still affect response time.

## Deploy and submit

Deploy to a Node-compatible Next.js host, configure environment values there,
and authorize its domain in Firebase Authentication. Static export cannot run
these server routes. Provide the hosted URL, a dedicated application demo account,
assessor database access, source ZIP and this README as specified by the brief.
Arrange access privately; never submit a service-account private key as a password.
Exclude node_modules, .next, backups, build caches and .env.local from the source ZIP.
Installed updater scripts are not needed to run the application.

See REQUIREMENTS-CHECK.md for evidence and remaining live checks. Tests and a
successful build cannot certify deployed authentication, live AI or assessor access.
