'use client'

import { useEffect, useState } from 'react'

const Confetti = () => {
  const [pieces, setPieces] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 150 }).map((_, index) => {
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
        backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
      };
      return <div key={index} className="confetti-piece" style={style} />;
    });
    setPieces(newPieces);
  }, []);

  return <div className="fixed inset-0 pointer-events-none z-[200]">{pieces}</div>;
};

export default Confetti;