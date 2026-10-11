import React, { useState } from 'react';
import { Car } from 'lucide-react';

/**
 * Maps vehicle model name keywords to their authentic simple SVG asset
 */
export function getCarSvgByModel(make = '', model = '') {
  const text = `${make} ${model}`.toLowerCase();

  if (text.includes('classic') || text.includes('bullet') || text.includes('enfield') || text.includes('cb350') || text.includes('h\'ness')) return '/cars/classic350.svg';
  if (text.includes('r15') || text.includes('yamaha') || text.includes('pulsar')) return '/cars/r15.svg';
  if (text.includes('duke') || text.includes('ktm')) return '/cars/duke390.svg';
  if (text.includes('ather') || text.includes('ola') || text.includes('iqube')) return '/cars/ather.svg';
  if (text.includes('activa') || text.includes('jupiter') || text.includes('access') || text.includes('scooter')) return '/cars/activa.svg';
  if (text.includes('bike') || text.includes('motorcycle')) return '/cars/classic350.svg';

  if (text.includes('swift')) return '/cars/swift.svg';
  if (text.includes('thar')) return '/cars/thar.svg';
  if (text.includes('innova')) return '/cars/innova.svg';
  if (text.includes('nexon')) return '/cars/nexon.svg';
  if (text.includes('creta')) return '/cars/creta.svg';
  if (text.includes('330') || text.includes('bmw')) return '/cars/bmw3.svg';
  if (text.includes('xuv') || text.includes('700')) return '/cars/xuv700.svg';
  if (text.includes('harrier') || text.includes('safari') || text.includes('scorpio')) return '/cars/xuv700.svg';
  if (text.includes('tiago')) return '/cars/tiago.svg';
  if (text.includes('fortuner')) return '/cars/fortuner.svg';
  if (text.includes('vitara')) return '/cars/grandvitara.svg';
  if (text.includes('verna')) return '/cars/verna.svg';
  if (text.includes('mercedes') || text.includes('e-class') || text.includes('c-class')) return '/cars/eclass.svg';
  if (text.includes('city') || text.includes('honda')) return '/cars/city.svg';

  // General default by category/type
  if (text.includes('suv') || text.includes('4x4')) return '/cars/thar.svg';
  if (text.includes('ev') || text.includes('electric')) return '/cars/nexon.svg';
  if (text.includes('sedan')) return '/cars/city.svg';

  return '/cars/swift.svg';
}

/**
 * Robust, clean vehicle image component with zero-broken-state guarantee
 */
export function VehicleImage({
  src,
  alt = 'Vehicle',
  make = '',
  model = '',
  style = {},
  className = '',
  regNumber = ''
}) {
  const [hasError, setHasError] = useState(false);

  // Determine source: If src is provided and no error, use it; otherwise resolve by model name
  const resolvedSrc = !hasError && src ? src : getCarSvgByModel(make, model);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #131722 0%, #0d111a 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      className={className}
    >
      <img
        src={resolvedSrc}
        alt={alt || `${make} ${model}`}
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        loading="lazy"
      />
    </div>
  );
}
