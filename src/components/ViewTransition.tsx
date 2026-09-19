import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export const ViewTransition: React.FC<{ viewKey: string; children: React.ReactNode }> = ({ viewKey, children }) => {
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => gsap.fromTo(scope.current,
      { autoAlpha: 0, y: 10, filter: 'blur(5px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out', clearProps: 'transform,filter,opacity,visibility' },
    ), scope);
    return () => context.revert();
  }, [viewKey]);

  return <div ref={scope} className="nexus-view-transition min-h-full" data-view={viewKey}>{children}</div>;
};
