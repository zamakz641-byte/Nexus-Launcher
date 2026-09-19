import React from 'react';

export const NexusMark: React.FC<{className?: string}> = ({className=''}) => (
  <svg className={className} viewBox="0 0 100 100" aria-label="Nexus">
    <defs>
      <linearGradient id="nxC" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#087ca8"/><stop offset=".45" stopColor="#19d7ff"/><stop offset=".72" stopColor="#d7f8ff"/><stop offset="1" stopColor="#21bce9"/></linearGradient>
      <linearGradient id="nxS" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f7fbff"/><stop offset=".45" stopColor="#78889b"/><stop offset="1" stopColor="#172335"/></linearGradient>
      <filter id="nxG"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path d="M12 84V18l18 8v30L64 15l14 7-48 63z" fill="url(#nxC)" filter="url(#nxG)"/>
    <path d="M29 26l42 52 17-9V13L72 25v31L43 20z" fill="url(#nxS)"/>
    <path d="M13 84l17-10V55l34-40-34 61z" fill="#02bde9" opacity=".55"/>
  </svg>
);