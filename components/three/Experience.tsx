'use client'

import { Suspense } from 'react'
import LavaLampBackground from './LavaLampBackground'
import ParticleCore from './ParticleCore'
import PostEffects from './PostEffects'

interface ExperienceProps {
  animState?: React.MutableRefObject<{ noiseForce: number; coreOpacity: number }>
}

export default function Experience({ animState }: ExperienceProps) {
  return (
    <Suspense fallback={null}>
      <LavaLampBackground />
      <ParticleCore animState={animState} />
      <PostEffects
        bloomIntensity={0.6}
        bloomLuminanceThreshold={0.1}
        vignetteDarkness={0.55}
      />
    </Suspense>
  )
}
