import Image, { type ImageProps } from "next/image";

// Wrapper that always sets crossOrigin="anonymous" so sprites from
// raw.githubusercontent.com satisfy the require-corp COEP header
// (needed for SharedArrayBuffer / mGBA pthreads on Safari).
export default function PokeImage(props: ImageProps) {
  return <Image {...props} crossOrigin="anonymous" />;
}
