"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { GameRepository } from "../../lib/db/GameRepository";
import { Game } from "../../types";
import { GameEngine } from "../../lib/engine/GameEngine";
import { MusicPlayer } from "../../lib/audio/MusicPlayer";

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // START AMBIENT MUSIC IN LOBBY
  useEffect(() => {
    MusicPlayer.play("/sounds/ambient-theme.mp3", true, 0.2);
    return () => MusicPlayer.stop();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/"); return; }
      const userGames = await GameRepository.getUserGames(user.uid);
      setGames(userGames);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const startNewGame = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const gameId = Math.random().toString(36).substring(7);
    const initialCountries = GameEngine.generateInitialCountries();
    await GameRepository.createGame(gameId, auth.currentUser.uid, initialCountries);
    router.push(`/game/${gameId}`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#03050a] text-[#f4c430] text-2xl font-black animate-pulse tracking-widest">LOADING COMMAND CENTER...</div>;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#03050a]">
      <div className="aurora-bg">
        <div className="aurora-blob blob-gold"></div>
        <div className="aurora-blob blob-blue"></div>
      </div>
      
      <div className="max-w-5xl mx-auto p-8 pt-20 relative z-10">
        <div className="flex justify-between items-end mb-12 border-b border-[#f4c430]/30 pb-6">
          <div>
            <h1 className="text-5xl text-[#f4c430] tracking-widest font-black uppercase title-gold">War Room</h1>
            <p className="text-gray-400 mt-2 text-xs tracking-[0.2em] uppercase">Select a campaign to resume, or launch a new invasion.</p>
          </div>
          <button onClick={() => { MusicPlayer.stop(); signOut(auth); }} className="text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest text-[10px] font-bold border border-white/10 px-4 py-2 rounded hover:border-red-500/50">
            Logout
          </button>
        </div>

        <button onClick={startNewGame} className="w-full bg-linear-to-r from-[#f4c430] to-[#fbbf24] text-black font-black p-5 rounded-xl mb-10 hover:shadow-[0_0_50px_rgba(244,196,48,0.5)] transition-all duration-300 text-xl tracking-[0.2em] uppercase">
          ⚔ Launch New Campaign
        </button>

        <h2 className="text-sm mb-4 text-[#f4c430] tracking-[0.2em] uppercase font-bold border-l-4 border-[#f4c430] pl-4">Resume Active Campaigns</h2>
        <div className="space-y-4">
          {games.length === 0 && <p className="text-gray-500 italic p-6 bg-black/40 rounded-xl border border-white/5 text-center">No active campaigns found. Launch a new one to begin.</p>}
          {games.map(game => (
            <div key={game.id} onClick={() => router.push(`/game/${game.id}`)} className="glass-panel p-6 cursor-pointer hover:border-[#f4c430] transition-all duration-300 hover:scale-[1.02] flex justify-between items-center group">
              <div>
                <p className="text-[#f4c430] font-bold text-lg group-hover:text-yellow-400 transition-colors tracking-widest">CAMPAIGN: {game.id.toUpperCase()}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Turn {game.turnNumber} · Started {new Date(game.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="bg-[#f4c430]/10 text-[#f4c430] px-6 py-3 rounded-lg text-sm font-black border border-[#f4c430]/30 group-hover:bg-[#f4c430] group-hover:text-black transition-all tracking-widest">
                RESUME
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { auth } from "../../lib/firebase/config";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { GameRepository } from "../../lib/db/GameRepository";
// import { Game } from "../../types";
// import { GameEngine } from "../../lib/engine/GameEngine";
// import { ParticleBackground } from "../../components/ParticleBackground";
// import { LoadingScreen } from "../../components/LoadingScreen";

// export default function LobbyPage() {
//   const [games, setGames] = useState<Game[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) { router.push("/"); return; }
//       const userGames = await GameRepository.getUserGames(user.uid);
//       setGames(userGames);
//       setLoading(false);
//     });
//     return () => unsubscribe();
//   }, [router]);

//   const startNewGame = async () => {
//     if (!auth.currentUser) return;
//     setLoading(true);
//     const gameId = Math.random().toString(36).substring(7);
//     const initialCountries = GameEngine.generateInitialCountries();
//     await GameRepository.createGame(gameId, auth.currentUser.uid, initialCountries);
//     router.push(`/game/${gameId}`);
//   };

//     if (loading) return <LoadingScreen />;

//   return (
//     <div className="min-h-screen relative overflow-hidden">
//       <div className="aurora-bg">
//         <div className="aurora-blob blob-gold"></div>
//         <div className="aurora-blob blob-blue"></div>
//       </div>
//       <ParticleBackground />
//       <div className="noise-overlay"></div>
//       <div className="vignette"></div>

//       <div className="max-w-5xl mx-auto p-8 pt-20 relative z-10">
//         <div className="flex justify-between items-end mb-12 border-b border-[#f4c430]/30 pb-6">
//           <div>
//             <h1 className="text-5xl text-[#f4c430] tracking-[0.2em] font-black uppercase title-gold">War Room</h1>
//             <p className="text-gray-400 mt-2 text-xs tracking-[0.2em] uppercase">Select a campaign to resume, or launch a new invasion.</p>
//           </div>
//           <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest text-[10px] font-bold border border-white/10 px-4 py-2 rounded hover:border-red-500/50">
//             Logout
//           </button>
//         </div>

//         <button onClick={startNewGame} className="w-full bg-linear-to-r from-[#f4c430] to-[#fbbf24] text-black font-black p-5 rounded-xl mb-10 hover:shadow-[0_0_50px_rgba(244,196,48,0.5)] hover:-translate-y-1 transition-all duration-300 text-xl tracking-[0.2em] uppercase">
//           ⚔ Launch New Campaign
//         </button>

//         <h2 className="text-sm mb-4 text-[#f4c430] tracking-[0.2em] uppercase font-bold border-l-4 border-[#f4c430] pl-4">Resume Active Campaigns</h2>
//         <div className="space-y-4">
//           {games.length === 0 && <p className="text-gray-500 italic p-6 bg-black/40 rounded-xl border border-white/5 text-center tracking-wider">No active campaigns found. Launch a new one to begin.</p>}
//           {games.map(game => (
//             <div key={game.id} onClick={() => router.push(`/game/${game.id}`)} className="glass-panel p-6 cursor-pointer hover:border-[#f4c430] transition-all duration-300 hover:scale-[1.02] flex justify-between items-center group">
//               <div>
//                 <p className="text-[#f4c430] font-bold text-lg group-hover:text-yellow-400 transition-colors tracking-widest">CAMPAIGN: {game.id.toUpperCase()}</p>
//                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Turn {game.turnNumber} · Started {new Date(game.createdAt).toLocaleDateString()}</p>
//               </div>
//               <span className="bg-[#f4c430]/10 text-[#f4c430] px-6 py-3 rounded-lg text-sm font-black border border-[#f4c430]/30 group-hover:bg-[#f4c430] group-hover:text-black transition-all tracking-widest">
//                 RESUME
//               </span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }