'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  particleCoreVertexShader,
  particleCoreFragmentShader,
} from './shaders/ParticleCoreShader'

const R_MIN = 3.5
const R_MAX = 8.0
const Y_RANGE = 14.0

interface ParticleCoreProps {
  animState?: React.MutableRefObject<{ noiseForce: number; coreOpacity: number }>
}

export default function ParticleCore({ animState }: ParticleCoreProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef(performance.now())
  const count = useRef(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1200 : 2200
  ).current

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 3)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const r = R_MIN + Math.random() * (R_MAX - R_MIN)
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * Y_RANGE

      positions[i * 3] = r * Math.cos(theta)
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = r * Math.sin(theta) - 1.0

      randoms[i * 3] = (Math.random() - 0.5) * 2
      randoms[i * 3 + 1] = (Math.random() - 0.5) * 2
      randoms[i * 3 + 2] = (Math.random() - 0.5) * 2

      phases[i] = Math.random() * Math.PI * 2
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    return geo
  }, [count])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0 },
        uSize: { value: 40 },
        uNoiseForce: { value: 1.0 },
        uCoreOpacity: { value: 1.0 },
        uColorA: { value: new THREE.Color('#7dd3fc') },
        uColorB: { value: new THREE.Color('#ff5e97') },
      },
      vertexShader: particleCoreVertexShader,
      fragmentShader: particleCoreFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame(() => {
    if (!pointsRef.current || !groupRef.current) return
    const t = (performance.now() - startTime.current) / 1000
    const breathe = Math.sin(t * 0.5) * 0.5 + 0.5

    const mat = pointsRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = t
    mat.uniforms.uBreath.value = breathe

    if (animState) {
      mat.uniforms.uNoiseForce.value = animState.current.noiseForce
      mat.uniforms.uCoreOpacity.value = animState.current.coreOpacity
    }

    groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.6 + t * 0.02
    groupRef.current.rotation.x = Math.sin(t * 0.04) * 0.15
    groupRef.current.position.z = Math.sin(t * 0.25) * 0.8
    groupRef.current.position.y = Math.sin(t * 0.18) * 0.4
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  )
}
