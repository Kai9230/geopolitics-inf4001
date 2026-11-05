# GeoPolitics

Next.js, React, TypeScript, Firebase Authentication,
Cloud Firestore and Groq.

## Run

1. Install Node.js 22 or newer. Run npm ci in this folder.
2. Preserve your existing .env.local. Fill any missing
   variables shown in .env.example.
3. Enable Firebase Email/Password Authentication and
   Cloud Firestore.
4. Publish src/lib/api/firestore.rules. With Firebase CLI,
   choose your own project using firebase use --add,
   then run:
   firebase deploy --only firestore:rules,firestore:indexes
5. Run npm test, npx tsc --noEmit, npm run lint,
   then npm run dev.
6. Open http://localhost:3000.
7. Configure your own server-side GROQ_API_KEY.
   Restart and verify a NEW battle exchange produces an
   AI-labelled report. A fallback alone does not
   demonstrate live AI.

## Play

Click your country with two or more soldiers, then an
enemy. One attack is allowed each turn, with repeated
automatic exchanges against the same target.

After conquest, transfer and finish your turn.
Transfer controls require two owned countries and no
active attack. Place all reinforcements first.

How to Play explains the PDF rules.

## Five bonus areas

- Graphics and 3D animation.
- Saved history and replay.
- NPC difficulty.
- Player analytics.
- Anti-cheating through server-authoritative dice,
  ownership, revisions and persistent attacks.

## Architecture

CampaignEngine and BattleRules own game rules.
NpcStrategy makes reasoned decisions.
CampaignRepository owns transactions and deletion.
API routes authenticate and validate.
CampaignExperience presents saved results.
BattleCommentary describes confirmed facts.

Browser writes to campaign documents remain denied.

## Deploy and submit

Use a Node-compatible Next.js host, such as your
Vercel project. This application needs server API
routes; a static export is insufficient.

Set the same environment variables on the host,
including public Firebase values before building.
Add the deployed domain to Firebase Authentication
authorized domains. Run npm run build and deploy.

Provide the PDF's source ZIP, hosted URL, application
test credentials, database assessor access and this
README.

Create a dedicated demo account and arrange assessor
database access privately.

Never include .env.local, Admin keys, node_modules,
.next or backups in the submitted source ZIP.

## Final live checks

Verify owner sign-in, new campaign, population armies,
round-two reinforcements, click attack, paired unsorted
dice and no-loss ties, stop, conquest reward, transfers,
elimination/victory, visible NPC reasons/fast-forward,
refresh protection, history, real Groq output, signed-out
spectator, second-account rejection and disposable
campaign deletion including its history.

These source changes do not certify a live deployment,
provider response or assessor permissions. Complete
those checks on the configured deployed application
before submission. No mark or selection is guaranteed.
