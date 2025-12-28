import React, { useEffect, useMemo, useState } from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  fallbackSrc?: string;
};

function buildFallbackCandidates(src: string): string[] {
  // Common issue: stored URL points to a missing optimized extension (e.g. .webp)
  // Try common alternatives without changing behavior for valid images.
  const candidates: string[] = [];

  // If URL contains query params, keep them.
  const [base, query] = src.split("?");
  const q = query ? `?${query}` : "";

  const lower = base.toLowerCase();

  const replaceExt = (ext: string) => {
    const next = base.replace(/\.[a-z0-9]+$/i, `.${ext}`);
    if (next !== base) candidates.push(`${next}${q}`);
  };

  // If it already has an extension, try alternatives.
  if (/\.[a-z0-9]+$/i.test(base)) {
    if (lower.endsWith(".webp")) {
      replaceExt("jpg");
      replaceExt("jpeg");
      replaceExt("png");
    } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
      replaceExt("webp");
      replaceExt("png");
    } else if (lower.endsWith(".png")) {
      replaceExt("webp");
      replaceExt("jpg");
      replaceExt("jpeg");
    } else {
      // Unknown extension — try webp then jpg
      replaceExt("webp");
      replaceExt("jpg");
      replaceExt("jpeg");
      replaceExt("png");
    }
  }

  return candidates;
}

export function FallbackImage({ src, fallbackSrc = "/placeholder.svg", onError, ...props }: Props) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);
  const [attempt, setAttempt] = useState(0);

  const candidates = useMemo(() => {
    if (!src) return [];
    return buildFallbackCandidates(src);
  }, [src]);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setAttempt(0);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      onError={(e) => {
        onError?.(e);

        // Try next candidate; otherwise fall back to placeholder.
        if (attempt < candidates.length) {
          const next = candidates[attempt];
          setAttempt((a) => a + 1);
          setCurrentSrc(next);
          return;
        }

        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
