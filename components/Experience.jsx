'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { PresentationControls, Line, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise, DepthOfField } from '@react-three/postprocessing';
import { useSessionStore } from '@/store/session-store';

// ---------------------------------------------------------
// GLSL Utilities
// ---------------------------------------------------------
const snoiseChunk = `
// Simplex 3D Noise by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
vec3 snoiseVec3( vec3 x ){
  float s  = snoise(vec3( x ));
  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  return vec3( s , s1 , s2 );
}
`;

// ---------------------------------------------------------
// SECTION 1: Practice Particles (Mind-Flow)
// ---------------------------------------------------------
const particleVertexShader = `
${snoiseChunk}
uniform float uTime;
uniform float uInteractionState; // 0=Idle, 1=Thinking, 2=Error
uniform float uOpacity;

attribute vec3 targetPosition;
attribute vec3 randomColor;
attribute float sizeOffset;
attribute float charIndex;

varying vec3 vColor;
varying float vAlpha;
varying float vCharIndex;

void main() {
    vColor = randomColor;
    vCharIndex = charIndex;
    vec3 pos = position;
    
    // Idle (Slow galaxy rotation and breathe)
    float idleNoise = snoise(targetPosition * 0.5 + uTime * 0.03);
    
    // Rotate around Y axis
    float angle = uTime * 0.03;
    mat2 rotY = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec3 idlePos = targetPosition;
    idlePos.xz = rotY * idlePos.xz;
    idlePos += idleNoise * 0.2;
    
    // Thinking (Expanding/Contracting low freq)
    float thinkNoise = sin(uTime * 0.6) * 0.5 + 0.5;
    vec3 thinkPos = idlePos * (1.1 + thinkNoise * 0.2);
    
    // Error (Spikey distortion)
    vec3 dir = normalize(targetPosition + vec3(0.001));
    float dist = length(targetPosition);
    vec3 spikeNoise = snoiseVec3(dir * 3.0 + uTime * 0.3);
    vec3 spikePos = dir * (dist + spikeNoise.x * 2.5);
    
    vec3 finalPos = mix(idlePos, thinkPos, clamp(uInteractionState, 0.0, 1.0));
    finalPos = mix(finalPos, spikePos, clamp(uInteractionState - 1.0, 0.0, 1.0));
    
    vAlpha = (0.4 + 0.6 * sin(uTime * 0.5 + sizeOffset * 10.0)) * uOpacity;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (26.0 + sizeOffset * 16.0) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const particleFragmentShader = `
uniform sampler2D uTexture;
varying vec3 vColor;
varying float vAlpha;
varying float vCharIndex;

void main() {
    float cols = 16.0;
    float col = mod(vCharIndex, cols);
    float row = cols - 1.0 - floor(vCharIndex / cols);
    
    vec2 cellUv = vec2(
        (gl_PointCoord.x + col) / cols,
        ((1.0 - gl_PointCoord.y) + row) / cols
    );
    
    vec4 texColor = texture2D(uTexture, cellUv);
    if (texColor.r < 0.05) discard;
    
    if (vAlpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, texColor.r * vAlpha);
}
`;

const PracticeParticles = ({ active, pathname = '/' }) => {
    const materialRef = useRef();
    const particleCount = 10000;
    
    const { isThinking, error } = useSessionStore();
    const hasError = !!error;
    const currentOpacity = useRef(0);
    const isHome = pathname === '/';
    
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1024, 1024);
        
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const words = ['mind', 'flow', 'word', 'verb', 'lens', 'glow', 'think', 'speak', 'learn', 'focus', 'light', 'sense', 'view'];
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const cols = 16;
        const cellSize = 64;
        
        for (let y = 0; y < cols; y++) {
            for (let x = 0; x < cols; x++) {
                const cellIndex = y * cols + x;
                const cellX = x * cellSize + cellSize / 2;
                const cellY = y * cellSize + cellSize / 2;
                
                let text = '';
                if (cellIndex < chars.length) {
                    text = chars[cellIndex];
                    ctx.font = 'bold 38px monospace';
                } else if (cellIndex - chars.length < words.length) {
                    text = words[cellIndex - chars.length];
                    ctx.font = 'bold 20px monospace';
                }
                
                if (text) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(text, cellX, cellY);
                }
            }
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.flipY = true;
        return tex;
    }, []);

    const { positions, targets, colors, sizes, charIndices } = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        const tgt = new Float32Array(particleCount * 3);
        const col = new Float32Array(particleCount * 3);
        const siz = new Float32Array(particleCount);
        const charsArr = new Float32Array(particleCount);
        const colorPalette = [
            new THREE.Color('#00FF9D'), new THREE.Color('#00E5FF'),
            new THREE.Color('#FFFFFF'), new THREE.Color('#00E5FF')
        ];

        // Total populating cells count: 52 chars + 13 words = 65 cells
        const totalGlyphs = 65;

        for (let i = 0; i < particleCount; i++) {
            pos[i*3] = (Math.random() - 0.5) * 50;
            pos[i*3+1] = (Math.random() - 0.5) * 50;
            pos[i*3+2] = (Math.random() - 0.5) * 50;
            
            const radius = Math.random() * 8 + 0.5;
            const branches = 3;
            const spin = radius * 0.8; 
            const branchAngle = ((i % branches) / branches) * Math.PI * 2;
            
            const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * (8 - radius);
            const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.8 * (8 - radius);
            const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5 * (8 - radius);
            
            tgt[i*3] = Math.cos(branchAngle + spin) * radius + randomX;
            tgt[i*3+1] = randomY * 0.5; 
            tgt[i*3+2] = Math.sin(branchAngle + spin) * radius + randomZ;
            
            const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            const coreColor = new THREE.Color('#FFFFFF');
            const distRatio = Math.min(radius / 8, 1);
            const finalColor = coreColor.clone().lerp(c, distRatio);
            
            col[i*3] = finalColor.r; col[i*3+1] = finalColor.g; col[i*3+2] = finalColor.b;
            siz[i] = Math.random() * 1.5;
            charsArr[i] = Math.floor(Math.random() * totalGlyphs);
        }
        return { positions: pos, targets: tgt, colors: col, sizes: siz, charIndices: charsArr };
    }, []);

    useFrame((state) => {
        if (materialRef.current) {
            const uniforms = materialRef.current.uniforms;
            uniforms.uTime.value = state.clock.elapsedTime;
            
            const targetOpacity = active ? (isHome ? 0.6 : 0.18) : 0.0;
            currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.05);
            uniforms.uOpacity.value = currentOpacity.current;
            
            let targetState = 0.0; 
            if (hasError) targetState = 2.0; 
            else if (isThinking) targetState = 1.0; 
            
            uniforms.uInteractionState.value = THREE.MathUtils.lerp(
                uniforms.uInteractionState.value, targetState, 0.05
            );
        }
    });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-targetPosition" count={particleCount} array={targets} itemSize={3} />
                <bufferAttribute attach="attributes-randomColor" count={particleCount} array={colors} itemSize={3} />
                <bufferAttribute attach="attributes-sizeOffset" count={particleCount} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-charIndex" count={particleCount} array={charIndices} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                vertexShader={particleVertexShader}
                fragmentShader={particleFragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uInteractionState: { value: 0.0 },
                    uOpacity: { value: 1.0 },
                    uTexture: { value: texture }
                }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

// ---------------------------------------------------------
// SECTION 2: Constellation (Discovery)
// ---------------------------------------------------------
const Constellation = ({ active }) => {
    const groupRef = useRef();
    const currentOpacity = useRef(0);
    const { discoveries, selectedNodeId, setSelectedNodeId } = useSessionStore();
    
    const nodes = useMemo(() => {
        return [
            { id: 'self-intro', label: '自我介绍', pos: new THREE.Vector3(0, -2.4, 0), size: 0.16 },
            { id: 'daily-routine', label: '日常起居', pos: new THREE.Vector3(-2.2, -0.8, 1.4), size: 0.14 },
            { id: 'likes-dislikes', label: '兴趣情感', pos: new THREE.Vector3(2.2, -0.8, -1.4), size: 0.14 },
            { id: 'everyday-situations', label: '日常口语', pos: new THREE.Vector3(-3.8, 0.8, 2.0), size: 0.12 },
            { id: 'question-asking', label: '提问交流', pos: new THREE.Vector3(-1.4, 1.0, 0.0), size: 0.12 },
            { id: 'opinion-expression', label: '观点表达', pos: new THREE.Vector3(1.4, 1.0, 0.0), size: 0.12 },
            { id: 'comparing-discussing', label: '对比讨论', pos: new THREE.Vector3(3.8, 0.8, -2.0), size: 0.12 },
            { id: 'storytelling', label: '故事叙事', pos: new THREE.Vector3(-2.0, 2.6, 1.0), size: 0.12 },
            { id: 'abstract-thinking', label: '抽象思维', pos: new THREE.Vector3(2.0, 2.6, -1.0), size: 0.12 },
        ];
    }, []);

    const connections = useMemo(() => {
        return [
            { from: 'self-intro', to: 'daily-routine' },
            { from: 'self-intro', to: 'likes-dislikes' },
            { from: 'daily-routine', to: 'everyday-situations' },
            { from: 'daily-routine', to: 'question-asking' },
            { from: 'likes-dislikes', to: 'opinion-expression' },
            { from: 'likes-dislikes', to: 'comparing-discussing' },
            { from: 'everyday-situations', to: 'storytelling' },
            { from: 'opinion-expression', to: 'abstract-thinking' },
            { from: 'comparing-discussing', to: 'abstract-thinking' },
        ];
    }, []);

    const getNodeStatus = (nodeId) => {
        const hasDiscovery = discoveries.some(d => d.knowledge_node_id === nodeId);
        if (hasDiscovery) return 'mastered';
        if (nodeId === 'self-intro') return 'learning';
        
        const parentConns = connections.filter(c => c.to === nodeId);
        const parentMastered = parentConns.some(c => 
            discoveries.some(d => d.knowledge_node_id === c.from) || c.from === 'self-intro'
        );
        return parentMastered ? 'learning' : 'locked';
    };

    const getNodeColor = (status) => {
        if (status === 'mastered') return '#00FF9D';
        if (status === 'learning') return '#00E5FF';
        return '#444444';
    };

    const lines = useMemo(() => {
        const segments = [];
        connections.forEach(conn => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (fromNode && toNode) {
                const status = getNodeStatus(conn.to);
                const color = status === 'mastered' ? '#00FF9D' : status === 'learning' ? '#00E5FF' : '#222222';
                const opacity = status === 'mastered' ? 0.75 : status === 'learning' ? 0.4 : 0.1;
                segments.push({
                    pts: [fromNode.pos, toNode.pos],
                    color,
                    opacity
                });
            }
        });
        return segments;
    }, [nodes, connections, discoveries]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.015;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.05;
            
            const targetOpacity = active ? 1.0 : 0.0;
            currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.05);
            
            groupRef.current.children.forEach(child => {
                if (child.material) {
                    const isLine = child.type === 'Line2' || child.material.type === 'LineMaterial';
                    if (isLine) {
                        child.material.opacity = currentOpacity.current * (child.userData?.baseOpacity || 0.5);
                    } else {
                        child.material.opacity = currentOpacity.current * 0.85;
                    }
                    child.visible = currentOpacity.current > 0.01;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {nodes.map((node, i) => {
                const status = getNodeStatus(node.id);
                const color = getNodeColor(status);
                const isSelected = selectedNodeId === node.id;
                const sizeMult = isSelected ? 1.5 : 1.0;
                
                return (
                    <mesh 
                        key={i} 
                        position={node.pos}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(isSelected ? null : node.id);
                        }}
                    >
                        <sphereGeometry args={[node.size * sizeMult, 16, 16]} />
                        <meshBasicMaterial color={color} transparent opacity={0} />
                        
                        {active && (
                            <Html 
                                distanceFactor={8} 
                                center 
                                style={{ 
                                    color: isSelected ? '#00FF9D' : '#ffffff', 
                                    pointerEvents: 'none', 
                                    whiteSpace: 'nowrap', 
                                    fontFamily: 'var(--font-display), monospace', 
                                    fontSize: isSelected ? '11px' : '9px',
                                    fontWeight: isSelected ? 'bold' : 'normal',
                                    textShadow: '0 0 10px rgba(0,0,0,0.9)',
                                    opacity: status === 'locked' ? 0.35 : 0.95,
                                    background: isSelected ? 'rgba(0,255,157,0.1)' : 'rgba(0,0,0,0.4)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: isSelected ? '1px solid #00FF9D' : '1px solid rgba(255,255,255,0.15)',
                                    transform: `translateY(${node.pos.y > 0 ? '16px' : '-16px'})`,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {node.label}
                            </Html>
                        )}
                    </mesh>
                );
            })}
            {lines.map((line, i) => (
                <Line 
                    key={`line-${i}`} 
                    points={line.pts} 
                    color={line.color} 
                    opacity={0} 
                    transparent 
                    lineWidth={1.5}
                    userData={{ baseOpacity: line.opacity }}
                />
            ))}
        </group>
    );
};

// ---------------------------------------------------------
// SECTION 3: Radar Mesh (Progress)
// ---------------------------------------------------------
const PlanetarySystem = ({ active }) => {
    const groupRef = useRef();
    const currentOpacity = useRef(0);
    
    const planets = useMemo(() => {
        const arr = [];
        const colors = ['#00FF9D', '#00E5FF', '#FFFFFF', '#00FF9D', '#00E5FF'];
        for(let i=0; i<5; i++) {
            arr.push({
                distance: 2 + i * 1.5,
                size: Math.random() * 0.3 + 0.1,
                speed: (0.5 + Math.random() * 0.5) * (i % 2 === 0 ? 1 : -1),
                color: colors[i % colors.length]
            });
        }
        return arr;
    }, []);

    const orbitPoints = useMemo(() => {
        return planets.map(p => {
            const pts = [];
            for (let i = 0; i <= 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                pts.push(new THREE.Vector3(Math.cos(angle) * p.distance, 0, Math.sin(angle) * p.distance));
            }
            return pts;
        });
    }, [planets]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1 + 0.2;
            groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.05) * 0.05;
            
            const targetOpacity = active ? 1.0 : 0.0;
            currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.05);
            
            groupRef.current.children.forEach((child) => {
                if (child.material) {
                    child.material.opacity = currentOpacity.current * (child.type === 'Line2' || child.material.type === 'LineMaterial' ? 0.2 : 0.9);
                    child.visible = currentOpacity.current > 0.01;
                }
                
                if (child.userData && child.userData.isPlanet) {
                    const time = state.clock.elapsedTime;
                    const p = child.userData;
                    child.position.x = Math.cos(time * p.speed) * p.distance;
                    child.position.z = Math.sin(time * p.speed) * p.distance;
                }
            });
        }
    });

    return (
        <PresentationControls
            global={false}
            cursor={true}
            snap={true}
            speed={2}
            zoom={1}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
        >
            <group ref={groupRef}>
                <mesh>
                    <sphereGeometry args={[1.0, 32, 32]} />
                    <meshBasicMaterial color="#FFFFFF" transparent opacity={0} />
                </mesh>
                
                {orbitPoints.map((pts, i) => (
                    <Line 
                        key={`orbit-${i}`} 
                        points={pts} 
                        color="#ffffff" 
                        opacity={0} 
                        transparent 
                        lineWidth={0.5} 
                    />
                ))}
                
                {planets.map((p, i) => (
                    <mesh key={`planet-${i}`} userData={{ isPlanet: true, ...p }}>
                        <sphereGeometry args={[p.size, 16, 16]} />
                        <meshBasicMaterial color={p.color} transparent opacity={0} />
                    </mesh>
                ))}
            </group>
        </PresentationControls>
    );
};

// ---------------------------------------------------------
// Main Scene Controller
// ---------------------------------------------------------
export const Experience = ({ pathname }) => {
    const cameraGroup = useRef();
    const { is3DMode } = useSessionStore();
    
    useFrame(() => {
        if (!cameraGroup.current) return;
        
        let targetZ = 0;
        let targetRotX = 0;
        let targetRotY = 0;
        
        if (is3DMode && pathname === '/discovery') {
            targetZ = 0.0;
            targetRotX = 0.0;
            targetRotY = 0.0;
        } else {
            if (pathname === '/practice') {
                targetZ = 0.5;
                targetRotX = Math.PI * 0.04;
                targetRotY = Math.PI * 0.03;
            } else if (pathname === '/discovery') {
                targetZ = 0.8;
                targetRotX = Math.PI * 0.08;
                targetRotY = -Math.PI * 0.06;
            } else if (pathname === '/progress') {
                targetZ = 1.0;
                targetRotX = Math.PI * 0.04;
                targetRotY = Math.PI * 0.08;
            } else {
                // Home / Profile
                targetZ = 0;
                targetRotX = 0;
                targetRotY = 0;
            }
        }

        cameraGroup.current.position.z = THREE.MathUtils.lerp(cameraGroup.current.position.z, targetZ, 0.05);
        cameraGroup.current.rotation.x = THREE.MathUtils.lerp(cameraGroup.current.rotation.x, targetRotX, 0.05);
        cameraGroup.current.rotation.y = THREE.MathUtils.lerp(cameraGroup.current.rotation.y, targetRotY, 0.05);
    });

    const isPractice = pathname === '/' || pathname === '/practice';
    const isDiscovery = pathname === '/discovery';

    return (
        <group ref={cameraGroup}>
            <PracticeParticles active={isPractice} pathname={pathname} />
            <Constellation active={isDiscovery && is3DMode} />

            {is3DMode && pathname === '/discovery' && (
                <OrbitControls 
                    enableZoom={true} 
                    enablePan={false} 
                    minDistance={2.5} 
                    maxDistance={12.0} 
                />
            )}
            
            {/* Post-Processing Pipeline */}
            <EffectComposer disableNormalPass multisampling={4}>
                <DepthOfField focusDistance={0.05} focalLength={0.1} bokehScale={2} height={480} />
                <Bloom 
                    luminanceThreshold={0.2} 
                    luminanceSmoothing={0.9} 
                    intensity={2.5} 
                    mipmapBlur 
                />
                <ChromaticAberration 
                    offset={[0.002, 0.002]} 
                    radialModulation={false}
                    modulationOffset={0.5}
                />
                <Noise opacity={0.05} />
                <Vignette 
                    eskil={false} 
                    offset={0.15} 
                    darkness={0.9} 
                />
            </EffectComposer>
        </group>
    );
};
