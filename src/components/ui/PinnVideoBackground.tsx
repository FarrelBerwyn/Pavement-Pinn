import React, { useEffect, useRef } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4';
const POSTER_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp';

interface PinnVideoBackgroundProps {
  className?: string;
  overlayClassName?: string;
  objectPosition?: string;
  hideOverlay?: boolean;
}

/**
 * Looping dual-stream video background with seamless cross-fade at loop boundary.
 * Styled in signature PINN brand yellow (#E8B52B) via hue rotation and color grading.
 */
export const PinnVideoBackground: React.FC<PinnVideoBackgroundProps> = ({
  className = '',
  overlayClassName = '',
  objectPosition = '50% 35%',
  hideOverlay = false,
}) => {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vA = videoARef.current;
    const vB = videoBRef.current;
    if (!vA || !vB) return;

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      vA.removeAttribute('autoplay');
      vA.pause();
      vB.pause();
      try {
        vA.currentTime = 0;
      } catch {
        // ignore
      }
      return;
    }

    const FADE = 0.9;
    let cur = vA;
    let nxt = vB;
    let swapping = false;
    let swapTimeout: ReturnType<typeof setTimeout> | null = null;

    const play = (v: HTMLVideoElement) => {
      try {
        const p = v.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Browsers may block initial autoplay until interaction or mute confirmation
          });
        }
      } catch {
        // ignore
      }
    };

    // Start playing video A
    play(vA);

    const tick = () => {
      if (swapping || !cur.duration) return;
      if (cur.duration - cur.currentTime > FADE) return;

      swapping = true;
      const out = cur;
      nxt.currentTime = 0;
      play(nxt);
      nxt.classList.add('is-active');
      out.classList.remove('is-active');

      // Swap reference pointers
      const temp = cur;
      cur = nxt;
      nxt = temp;

      swapTimeout = setTimeout(() => {
        out.pause();
        out.currentTime = 0;
        swapping = false;
      }, FADE * 1000 + 100);
    };

    vA.addEventListener('timeupdate', tick);
    vB.addEventListener('timeupdate', tick);

    return () => {
      vA.removeEventListener('timeupdate', tick);
      vB.removeEventListener('timeupdate', tick);
      if (swapTimeout) clearTimeout(swapTimeout);
    };
  }, []);

  return (
    <div
      className={`pinn-banner-bg ${className}`}
      role="img"
      aria-label="Stylised globe of Earth rendered as a golden PINN dot matrix against a starfield, slowly rotating"
    >
      <video
        ref={videoARef}
        id="bgVideoA"
        className="pinn-bg-video is-active"
        style={{ objectPosition }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        poster={POSTER_URL}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      <video
        ref={videoBRef}
        id="bgVideoB"
        className="pinn-bg-video"
        style={{ objectPosition }}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        poster={POSTER_URL}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* PINN Yellow brand ambiance glow & legibility vignette */}
      {!hideOverlay && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            overlayClassName ||
            'bg-[radial-gradient(ellipse_at_50%_40%,rgba(232,181,43,0.16)_0%,transparent_75%)] bg-gradient-to-t from-black/90 via-black/40 to-black/75'
          }`}
        />
      )}
      <div className="absolute inset-0 bg-[#E8B52B]/10 mix-blend-color pointer-events-none" />
    </div>
  );
};
