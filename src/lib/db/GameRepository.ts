import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import type { Country, Game } from "../../types";

export class GameRepository {
  private static COLLECTION = "games";

  static async createGame(
    gameId: string,
    playerId: string,
    initialCountries: Country[],
  ): Promise<void> {
    await setDoc(
      doc(db, this.COLLECTION, gameId),
      {
        id: gameId,
        status: "active",
        currentTurnPlayerId: playerId,
        turnNumber: 1,
        playerId,
        createdAt: Date.now(),
      },
    );

    for (const country of initialCountries) {
      await setDoc(
        doc(
          db,
          this.COLLECTION,
          gameId,
          "countries",
          country.id,
        ),
        country,
      );
    }
  }

  static async getUserGames(
    playerId: string,
  ): Promise<Game[]> {
    const gamesQuery = query(
      collection(db, this.COLLECTION),
      where("playerId", "==", playerId),
    );

    const snapshot = await getDocs(gamesQuery);

    return snapshot.docs
      .filter((item) => !item.data().deletedAt)
      .map(
        (item) =>
          ({
            ...item.data(),
            id: item.id,
          }) as Game,
      );
  }

  static async deleteFromHistory(
    gameId: string,
  ): Promise<void> {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error("Please sign in first.");
    }

    const reference = doc(
      db,
      this.COLLECTION,
      gameId,
    );

    const snapshot = await getDoc(reference);

    if (
      !snapshot.exists() ||
      snapshot.data().playerId !== uid
    ) {
      throw new Error(
        "You can only delete your own campaigns.",
      );
    }

    await updateDoc(reference, {
      deletedAt: Date.now(),
    });
  }

  static async restoreToHistory(
    gameId: string,
  ): Promise<void> {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error("Please sign in first.");
    }

    const reference = doc(
      db,
      this.COLLECTION,
      gameId,
    );

    const snapshot = await getDoc(reference);

    if (
      !snapshot.exists() ||
      snapshot.data().playerId !== uid
    ) {
      throw new Error(
        "You can only restore your own campaigns.",
      );
    }

    await updateDoc(reference, {
      deletedAt: deleteField(),
    });
  }
}