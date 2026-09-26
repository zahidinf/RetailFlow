"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
}

const DEFAULT_IMAGE = "/images/default-product.jpg";

export default function ProductImage({
  src,
  alt,
  className = "",
  fill = false,
  width,
  height,
  priority = false,
  sizes,
}: ProductImageProps) {
  const initialSrc = src && src.trim() ? src.trim() : DEFAULT_IMAGE;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const nextSrc = src && src.trim() ? src.trim() : DEFAULT_IMAGE;
    setImgSrc(nextSrc);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError && imgSrc !== DEFAULT_IMAGE) {
      setHasError(true);
      setImgSrc(DEFAULT_IMAGE);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading={priority ? "eager" : "lazy"}
      style={{
        objectFit: "cover",
      }}
    />
  );
}
