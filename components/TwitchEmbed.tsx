'use client';

import { useEffect, useRef } from 'react';

interface TwitchEmbedProps {
  channel: string;
}

export default function TwitchEmbed({ channel }: TwitchEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://embed.twitch.tv/embed/v1.js';
    script.async = true;

    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).Twitch) {
        new (window as any).Twitch.Embed(containerRef.current, {
          channel,
          width: '100%',
          height: '100%',
          layout: 'video',
          autoplay: true,
          muted: false
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [channel]);

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      <div
        ref={containerRef}
        className="aspect-video w-full"
        id="twitch-embed"
      />
    </div>
  );
}