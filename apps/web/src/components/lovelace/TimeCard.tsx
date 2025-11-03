'use client';

import React, { useState, useEffect } from 'react';
import { BaseCard } from './BaseCard';
import { gradients } from './theme';

export function TimeCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 5
      ? 'Late night mode'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const gradient = gradients['dark-cyan'];

  return (
    <BaseCard
      name="Today"
      isActive={true}
      gradient={gradient}
      height="200px"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          padding: '18px',
        }}
      >
        <div
          style={{
            color: '#00ffff',
            fontSize: '10px',
            fontWeight: 500,
            textShadow: '0 0 10px rgba(0,255,255,0.5)',
            marginBottom: '8px',
          }}
        >
          TODAY
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 300,
            color: '#e6ffff',
            textShadow: '0 0 20px rgba(0,255,255,0.65)',
            marginBottom: '4px',
          }}
        >
          {timeString} • {dateString}
        </div>
        <div
          style={{
            color: 'rgba(200,255,255,0.8)',
            fontSize: '8px',
            letterSpacing: '0.3px',
          }}
        >
          {greeting}
        </div>
      </div>
    </BaseCard>
  );
}
