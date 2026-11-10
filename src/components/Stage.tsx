import { useEffect, useState, type ReactNode } from 'react';
import { STAGE, layoutVars } from '../layout';

function fitScale(): number {
  return Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
}

/** A fixed 1920 by 1080 canvas, scaled uniformly to fit the window. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => {
      setScale(fitScale());
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return (
    <div className="stage" style={{ ...layoutVars, transform: `translate(-50%, -50%) scale(${String(scale)})` }}>
      {children}
    </div>
  );
}
