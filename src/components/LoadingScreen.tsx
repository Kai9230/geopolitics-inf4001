// "use client";
// import { ParticleBackground } from "./ParticleBackground";

// export function LoadingScreen() {
//   return (
//     <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#03050a] overflow-hidden">
      
//       {/* Background Particles */}
//       <ParticleBackground />
      
//       {/* Earth Orb (Scaled down for loading) */}
//       <div className="relative flex items-center justify-center mb-10">
//         <div className="earth-halo" style={{ position: 'absolute', inset: '-40px', borderRadius: '50%' }}></div>
//         <div className="earth-sphere" style={{ width: '280px', height: '280px' }}>
//           <div className="earth-continents"></div>
//         </div>
//       </div>

//       {/* Loading Text */}
//       <h2 className="text-[#f4c430] text-xl md:text-2xl font-black uppercase tracking-[0.4em] animate-pulse">
//         Mobilizing Forces
//       </h2>

//       {/* Three bouncing dots */}
//       <div className="flex gap-2 mt-6">
//         <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0s' }}></div>
//         <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
//         <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0.4s' }}></div>
//       </div>
      
//     </div>
//   );
// }


"use client";
import { ParticleBackground } from "./ParticleBackground";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#03050a] overflow-hidden">
      
      {/* Background Particles */}
      <ParticleBackground />
      
      {/* Earth Orb (Scaled down for loading) */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="earth-halo" style={{ position: 'absolute', inset: '-40px', borderRadius: '50%' }}></div>
        <div className="earth-sphere" style={{ width: '280px', height: '280px' }}>
          <div className="earth-continents"></div>
        </div>
      </div>

      {/* Loading Text */}
      <h2 className="text-[#f4c430] text-xl md:text-2xl font-black uppercase tracking-[0.4em] animate-pulse">
        Mobilizing Forces
      </h2>

      {/* Three bouncing dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-[#f4c430] animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
      
    </div>
  );
}