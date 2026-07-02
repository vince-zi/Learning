'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  lavaLampVertexShader,
  lavaLampFragmentShader,
} from './shaders/LavaLampShader'

export default function LavaLampBackground() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()
  const startTime = useRef(performance.now())

  const scale = useMemo(() => {
    // Massive over-scale so the radial alpha fade eliminates all edges
    // The plane is just a canvas for the noise — no visible boundary
    return [viewport.width * 5, viewport.height * 5, 1] as const
  }, [viewport.width, viewport.height])

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uBreath: { value: 0 },
    },
    vertexShader: lavaLampVertexShader,
    fragmentShader: lavaLampFragmentShader,
    transparent: true,
    depthWrite: false,
  }), [])

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    const t = (performance.now() - startTime.current) / 1000

    mat.uniforms.uTime.value = t
    mat.uniforms.uBreath.value = Math.sin(t * 0.5) * 0.5 + 0.5
  })

  return (
    <mesh ref={meshRef} scale={scale} position={[0, 0, -6]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial args={[shaderArgs]} />
    </mesh>
  )
}
