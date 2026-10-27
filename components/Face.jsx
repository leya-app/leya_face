'use client';

// Стилизирано лице. zone = подсветената зона, metric + p (0..1) = движението.
export default function Face({ zone, metric, p = 0, muted = false, guides = false, size = 240, label }) {
  const skin = muted ? '#6B5563' : '#F1DCD2';
  const neckSkin = muted ? '#5C4855' : '#E6CBBF';
  const feature = muted ? '#2A2330' : '#5A3F4A';
  const hl = '#F2B49B';
  const browY = metric === 'brows' ? -14 * p : 0;
  const eyeRy = metric === 'eyesOpen' ? 6 + 4 * p : metric === 'eyesClose' ? 6 - 3.5 * p : 6;
  const tilt = metric === 'tilt' ? 16 * p : 0;
  const lift = metric === 'chinUp' ? -10 * p : 0;
  const tuck = metric === 'tuck' ? 1 - 0.06 * p : 1;

  let mouth;
  if (metric === 'fish') {
    mouth = (
      <>
        <ellipse cx="130" cy="234" rx={20 - 11 * p} ry={5 + 3 * p} fill="#3A2430" stroke="#B5707A" strokeWidth="3" />
        <path d={`M${70 + 8 * p} 196 Q${84 + 6 * p} 222 ${90 + 4 * p} 246 M${190 - 8 * p} 196 Q${176 - 6 * p} 222 ${170 - 4 * p} 246`} fill="none" stroke="#C9A99C" strokeWidth="2" opacity={p} />
      </>
    );
  } else if (metric === 'cheekLift') {
    mouth = (
      <>
        <ellipse cx="130" cy="234" rx="11" ry="9" fill="#3A2430" stroke="#B5707A" strokeWidth="3" />
        <ellipse cx="86" cy={204 - 12 * p} rx="16" ry="9" fill="#F2B49B" opacity={0.35 + 0.4 * p} />
        <ellipse cx="174" cy={204 - 12 * p} rx="16" ry="9" fill="#F2B49B" opacity={0.35 + 0.4 * p} />
      </>
    );
  } else if (metric === 'mouthO') {
    mouth = <ellipse cx="130" cy="234" rx={22 - 9 * p} ry={4 + 14 * p} fill="#3A2430" stroke="#B5707A" strokeWidth="3" />;
  } else if (metric === 'jawOpen') {
    mouth = <ellipse cx="130" cy={234 + 4 * p} rx="18" ry={3 + 15 * p} fill="#3A2430" stroke="#B5707A" strokeWidth="3" />;
  } else {
    const w = metric === 'smile' ? 12 * p : 0;
    const up = metric === 'smile' ? 7 * p : 0;
    mouth = (
      <path
        d={`M${108 - w} ${232 - up} Q130 ${242 + 4 * (metric === 'smile' ? p : 0)} ${152 + w} ${232 - up}`}
        fill="none" stroke="#B5707A" strokeWidth="4" strokeLinecap="round"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 260 330"
      width={size}
      height={(size * 330) / 260}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <rect x="96" y="236" width="68" height="90" rx="18" fill={zone === 'neck' ? hl : neckSkin} />
      <g transform={`rotate(${tilt} 130 250) translate(0 ${lift}) translate(130 150) scale(${tuck}) translate(-130 -150)`}>
        <ellipse cx="130" cy="150" rx="92" ry="118" fill={skin} opacity={muted ? 0.75 : 1} />
        {zone === 'forehead' && (
          <>
            <path d="M48 108 Q130 14 212 108 L200 124 Q130 88 60 124 Z" fill={hl} />
            <path d="M80 104 L80 118 M105 92 L105 110 M130 88 L130 106 M155 92 L155 110 M180 104 L180 118" stroke="#D98A6E" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {zone === 'eyes' && (
          <>
            <ellipse cx="89" cy="160" rx="28" ry="17" fill={hl} />
            <ellipse cx="171" cy="160" rx="28" ry="17" fill={hl} />
          </>
        )}
        {zone === 'naso' && (
          <>
            <path d="M112 196 Q94 214 102 244" fill="none" stroke={hl} strokeWidth="12" strokeLinecap="round" />
            <path d="M148 196 Q166 214 158 244" fill="none" stroke={hl} strokeWidth="12" strokeLinecap="round" />
          </>
        )}
        {guides && metric === 'brows' && (
          <>
            <path d="M68 122 Q88 110 110 118" fill="none" stroke={hl} strokeWidth="2" strokeDasharray="3 5" />
            <path d="M150 118 Q172 110 192 122" fill="none" stroke={hl} strokeWidth="2" strokeDasharray="3 5" />
          </>
        )}
        <g transform={`translate(0 ${browY})`}>
          <path d="M68 138 Q88 126 110 134" fill="none" stroke={muted ? '#F6F1EE' : feature} strokeWidth="5" strokeLinecap="round" />
          <path d="M150 134 Q172 126 192 138" fill="none" stroke={muted ? '#F6F1EE' : feature} strokeWidth="5" strokeLinecap="round" />
          {guides && metric === 'brows' && (
            <>
              <circle cx="68" cy="138" r="3.5" fill="#9CC5A1" />
              <circle cx="110" cy="134" r="3.5" fill="#9CC5A1" />
              <circle cx="150" cy="134" r="3.5" fill="#9CC5A1" />
              <circle cx="192" cy="138" r="3.5" fill="#9CC5A1" />
            </>
          )}
        </g>
        <ellipse cx="89" cy="160" rx="14" ry={eyeRy} fill={feature} />
        <ellipse cx="171" cy="160" rx="14" ry={eyeRy} fill={feature} />
        <path d="M130 172 L124 204 Q130 209 136 204" fill="none" stroke={muted ? '#8A7280' : '#C9A99C'} strokeWidth="2" />
        {mouth}
      </g>
    </svg>
  );
}
