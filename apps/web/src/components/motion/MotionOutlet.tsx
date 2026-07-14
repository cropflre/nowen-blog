import { useLocation, useOutlet } from 'react-router-dom';

interface MotionOutletProps {
  className?: string;
}

export function MotionOutlet({ className = '' }: MotionOutletProps) {
  const location = useLocation();
  const outlet = useOutlet();
  const key = `${location.pathname}${location.search}`;

  return (
    <div key={key} className={`nowen-page-motion ${className}`.trim()} data-motion-scope="true">
      {outlet}
    </div>
  );
}
