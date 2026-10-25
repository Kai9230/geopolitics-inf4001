import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { Game, Country } from "../../types";

export class GameRepository {
  private static COLLECTION = "games";

  static async createGame(gameId: string, playerId: string, initialCountries: Country[])
   {
    const gameRef = doc(db, this.COLLECTION, gameId);
    await setDoc(gameRef, {
      id: gameId,
      status: 'active',
      currentTurnPlayerId: playerId,
      turnNumber: 1,
      playerId: playerId,
      createdAt: Date.now(),
    });

    for (const country of initialCountries) {
      const countryRef = doc(db, `${this.COLLECTION}/${gameId}/countries`, country.id);
      await setDoc(countryRef, country);
    }
  }

  static async getUserGames(playerId: string) {
    const q = query(collection(db, this.COLLECTION), where("playerId", "==", playerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Game);
  }
}