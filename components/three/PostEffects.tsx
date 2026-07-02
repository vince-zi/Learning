'use client'

import { useEffect, useState } from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

interface PostEffectsProps {
  bloomIntensity?: number
  bloomLuminanceThreshold?: number
  bloomLuminanceSmoothing?: number
  vignetteOffset?: number
  vignetteDarkness?: number
}

export default function PostEffects({
  bloomIntensity = 0.6,
  bloomLuminanceThreshold = 0.15,
  bloomLuminanceSmoothing = 0.9,
  vignetteOffset = 0.3,
  vignetteDarkness = 0.5,
}: PostEffectsProps) {
  // Reduce bloom on mobile for performance
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsMobile(window.innerWidth < 768)
  }, [])

  const effectiveBloom = isMobile ? Math.min(bloomIntensity, 0.3) : bloomIntensity

  return (
    <EffectComposer>
      <Bloom
        intensity={effectiveBloom}
        luminanceThreshold={bloomLuminanceThreshold}
        luminanceSmoothing={bloomLuminanceSmoothing}
      />
      <Vignette
        offset={vignetteOffset}
        darkness={vignetteDarkness}
      />
    </EffectComposer>
  )
}
