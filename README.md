GeoPolitics
INF4001 — Application Guide
1. About the application
GeoPolitics is a single-player strategy game in which you compete against computer-controlled opponents to take control of ten countries. You choose a starting country, manage soldiers, attack opponents and decide how to distribute reinforcements. Campaigns are saved so that you can leave and continue later.

This guide explains how to access and use the submitted application. The hosted version is ready to use in a browser; no installation or VS Code setup is needed.
2. Website and login details
Application URL: Open GeoPolitics

Use a current version of Chrome, Edge, Firefox or another modern browser with an internet connection.

The demonstration account email and password are supplied separately in SUBMISSION-DETAILS.txt, submitted privately through Amathuba.

To begin:
1. Open the application URL.
2. Enter the demonstration email and password on the sign-in page.
3. Sign in to open the campaign lobby.
You may also use the registration option to create a separate application account. Campaign ownership is associated with the account that creates the campaign.
3. Creating a campaign
The lobby is the starting point for creating and managing games.
1. Choose the country you would like to control at the start.
2. Select a difficulty level.
3. Use the campaign creation control to start the game.
Each campaign contains your selected country and nine different randomly selected countries. Starting armies are calculated from country populations, and the participant turn order is randomised.

The campaign screen displays the board, countries, soldier counts, turn information and available actions. Follow the turn indicator to see whether it is your turn or an opponent's turn.
4. Playing your turn
Reinforcements
From round two, your reinforcement total is two soldiers for each country you own. When the allocation controls appear, choose how to distribute the full total across your countries and confirm the allocation before continuing.
Attacking
1. Select a country you own with at least two soldiers.
2. Select an enemy country as the target.
3. Confirm the attack using the available attack control.
4. Watch the dice, casualties and battle outcome as the attack progresses.
A turn allows one attack against one target. Several dice exchanges may take place within that attack; they do not allow a second target to be attacked during the same turn.

Both sides roll a number of dice equal to the smaller of the attacking country's soldiers minus one and the defending country's soldiers. Dice are compared in their original pair order. A tied pair causes no casualty.

The attack ends when the target is conquered, the attacking country has only one soldier left, or you stop the attack. An exhausted attacker keeps its country with one soldier. Conquest rewards are based on the conquered country's original soldier value.
Stopping an attack
Use the stop control to stop the attack and end your turn. If a dice exchange is already resolving, it finishes before the stop takes effect.
Transferring soldiers
Use the transfer controls to move soldiers between countries you own when no attack is active. Choose the source country, destination country and amount, then confirm.

The transfer must leave at least one soldier in the source country. After a conquest, use the available transfer controls before ending your turn. A conquest does not permit another attack against a new target in that turn.
Computer-controlled opponents
Opponents take their turns automatically while the owner's campaign is open. Their actions and explanations are shown in the campaign presentation. The speed control accelerates NPC presentation and waits when a player decision is required.
Winning
The campaign ends when one participant controls all ten countries. Continue playing to reach the completed campaign result screen.
5. Saving and resuming campaigns
Campaign progress is saved as confirmed actions are processed.

To continue a game later:
1. Sign in with the account that created it.
2. Open the lobby.
3. Locate the campaign and open it to resume.
Use campaign search and status filters to find particular games. You can create more than one campaign and return to each independently.
6. Battle history and replay
The campaign history records events and outcomes. Replay lets you review saved boards, dice results and recorded commentary.

Replay is a view of the saved game history. It does not roll new dice or submit new moves. Use the replay controls to review the available events, then return to the live campaign to continue playing.
7. Sharing a campaign and spectator access
1. Open the campaign you would like to share.
2. Click Share.
3. A Link copied message confirms that the campaign URL has been copied. If the browser prevents automatic copying, use the displayed URL.
4. Open that URL in another browser or a signed-out private window to view the campaign as a spectator.
Spectators can see the board, soldier counts and history. They cannot control the owner's turns or delete the owner's campaign.

The owner must remain signed in with the campaign open for the current NPC simulation to advance. A spectator session alone does not advance opponents' turns.
8. Commentary and audio
Battle commentary accompanies the action. Reports generated by the language model are labelled AI. If that external service is unavailable, the application displays a fallback labelled Battle report.

Use the audio controls to enable or mute sound. Your mute preference is saved in the browser. Depending on browser settings, you may need to click or interact with the page before audio can play.
9. Additional features
Alongside the main game, the application includes:
- Animated attacks, dice and battle miniatures.
- Saved battle and campaign replay.
- NPC difficulty levels and faster NPC presentation.
- Campaign analytics.
- Temporary diplomacy, alliances and reputation.
- Shared spectator access.
Diplomacy influences strategic decisions without changing the base dice rules or the objective of controlling all ten countries. Use the available diplomacy controls when offered during play.

The application also validates ownership, turns, troop amounts and campaign revisions on the server, and generates battle dice server-side.

For further gameplay guidance, open How to play within the application.
10. Database access for assessment
The application uses Cloud Firestore in Firebase. The Firebase project ID and database-access confirmation are provided in SUBMISSION-DETAILS.txt.

To inspect the database using an authorised assessor account:
1. Open Firebase Console.
2. Sign in with the Google account associated with the project access invitation.
3. Select the project identified in the submission details.
4. Open Firestore Database to inspect the stored campaign data, subject to the permissions assigned.
The assessor accounts specified in the assignment are:
- ammarcanani@gmail.com
- mc.tanner@uct.ac.za
- ridewaan.hanslo@uct.ac.za
Firebase project access is separate from the application's demonstration login. Use the demonstration email and password for the game, and your authorised Google account for Firebase Console.
11. Optional: running the submitted source locally
This section is only needed if you wish to run the source code. It is not required to assess the hosted website.

Prerequisites: Node.js 24 LTS with npm, an internet connection, and valid Firebase and Groq configuration. Private service credentials are excluded from the source ZIP. Local execution requires authorised credentials; a database-viewing invitation alone does not supply them.
1. Extract the source ZIP and open a terminal in the folder containing package.json.
2. Install dependencies:
   npm ci
3. Copy .env.example to .env.local beside package.json. Populate the Firebase browser configuration, Firebase server credentials and Groq settings listed in that example. Use the same Firebase project for the browser and server configuration. Keep private keys server-side.
4. Ensure the configured Firebase project has Email/Password Authentication enabled, Firestore available, localhost authorised for authentication, and the supplied Firestore rules and indexes deployed. The root firebase.json identifies the rules and indexes files.
5. Start the application:
   npm run dev
6. Open http://localhost:3000. Keep the terminal running while using the local application. Press Ctrl+C to stop it.
To run a local production build, run these commands in order, waiting for the build to finish successfully before starting:
npm run build
npm start
Use the submitted package.json and package-lock.json together so the dependency versions and compatibility settings are preserved.
12. Submitted materials
- Source ZIP: application source code, assets and configuration files.
- README.md: this access and usage guide.
- SUBMISSION-DETAILS.txt: deployed URL, demonstration login, Firebase project ID and database-access confirmation, supplied privately through Amathuba.
The deployed website is the main entry point for using and assessing GeoPolitics.


