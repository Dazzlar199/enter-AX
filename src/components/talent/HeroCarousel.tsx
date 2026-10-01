"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  image: string;
  tone: "dark" | "blue" | "warm";
};

const INTERVAL_MS = 6000;

/** Auto-advancing banner. Pauses on hover/focus and when the user prefers reduced motion. */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  return (
    <section
      aria-label="주요 소식"
      aria-roledescription="carousel"
      className="hc"
      data-tone={slides[index]?.tone}
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hc__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, slideIndex) => (
          <article
            aria-hidden={slideIndex !== index}
            aria-label={`${slideIndex + 1} / ${count}`}
            aria-roledescription="slide"
            className="hc__slide"
            data-tone={slide.tone}
            key={slide.id}
          >
            <div className="hc__text">
              <p className="hc__eyebrow">{slide.eyebrow}</p>
              <h2>{slide.title}</h2>
              <p className="hc__body">{slide.body}</p>
              <Link className="hc__cta" href={slide.cta.href} tabIndex={slideIndex === index ? 0 : -1}>{slide.cta.label}</Link>
            </div>
            <div className="hc__image">
              <Image alt="" fill priority={slideIndex === 0} sizes="(max-width: 900px) 100vw, 640px" src={slide.image} style={{ objectFit: "cover" }} />
            </div>
          </article>
        ))}
      </div>

      {count > 1 ? (
        <div className="hc__controls">
          <span className="hc__count" aria-live="polite">{index + 1} / {count}</span>
          <button aria-label="이전 소식" className="hc__arrow" type="button" onClick={() => go(index - 1)}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button aria-label="다음 소식" className="hc__arrow" type="button" onClick={() => go(index + 1)}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      ) : null}
      {count > 1 ? (
        <div className="hc__dots">
          {slides.map((slide, slideIndex) => (
            <button aria-current={slideIndex === index} aria-label={`${slideIndex + 1}번째 소식`} className="hc__dot" key={slide.id} type="button" onClick={() => go(slideIndex)} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
