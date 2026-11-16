import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import type { MapPerson } from './api'
import { PALETTE, accentPaint, tileFloor, woodFloor } from './office-materials'
import {
  POD_SIZE,
  QUADRANTS,
  STATUS_COLOR,
  STATUS_LABEL,
  extent,
  seatAt,
  type Pod,
  type Room,
  type Spot,
} from './office-layout'

export type MapSelection = { kind: 'person'; id: string } | { kind: 'room'; id: string } | null

// The floating buttons (zoom, rotate, home) drive the camera through this.
export type MapCameraCommands = {
  zoom: (factor: number) => void
  rotate: (angle: number) => void
  reset: () => void
}

type Props = {
  rooms: Room[]
  selection: MapSelection
  onSelect: (selection: MapSelection) => void
  // People outside the current filter are drawn faded.
  isDimmed: (person: MapPerson) => boolean
  commandsRef: RefObject<MapCameraCommands | null>
}

// What the rig uses of drei's OrbitControls (the default controls).
type Controls = THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3 }

const SKIN = PALETTE.skin
const WOOD = PALETTE.desk
const METAL = PALETTE.deskLeg
const PARTITION = PALETTE.partition
const CHAIR = PALETTE.chair
const ME = '#f5b301'
const OFF_SCREEN = '#1f2937'

const DESK_HEIGHT = 0.75
const WALL_HEIGHT = 2.4
// From the seat to the monitor at the inner corner of its L desk.
const MONITOR_DISTANCE = 1.2

function setCursor(value: string) {
  document.body.style.cursor = value
}

// --- Furniture -------------------------------------------------------------

// The four L desks and the cross partition of a workstation ("ilha"), as in
// an open-plan office. Seats and monitors are drawn per person.
function Workstation({ center }: { center: [number, number] }) {
  const arm = POD_SIZE / 2 - 0.55
  return (
    <group position={[center[0], 0, center[1]]}>
      {QUADRANTS.map(([sx, sz]) => (
        <group key={`${sx}${sz}`}>
          {/* The L: one arm along each partition. */}
          <mesh position={[sx * (arm / 2 + 0.05), DESK_HEIGHT, sz * 0.45]} castShadow receiveShadow>
            <boxGeometry args={[arm, 0.06, 0.8]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
          <mesh position={[sx * 0.45, DESK_HEIGHT, sz * (arm / 2 + 0.05)]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.06, arm]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
          {/* Legs at the outer ends. */}
          {[
            [sx * (arm + 0.02), sz * 0.45],
            [sx * 0.45, sz * (arm + 0.02)],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, DESK_HEIGHT / 2, z]}>
              <boxGeometry args={[0.06, DESK_HEIGHT, 0.6]} />
              <meshStandardMaterial color={METAL} metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Cross partition. */}
      <mesh position={[0, DESK_HEIGHT + 0.35, 0]} castShadow>
        <boxGeometry args={[POD_SIZE - 0.9, 0.7, 0.05]} />
        <meshStandardMaterial color={PARTITION} roughness={0.9} />
      </mesh>
      <mesh position={[0, DESK_HEIGHT + 0.35, 0]} castShadow>
        <boxGeometry args={[0.05, 0.7, POD_SIZE - 0.9]} />
        <meshStandardMaterial color={PARTITION} roughness={0.9} />
      </mesh>
    </group>
  )
}

function Chair({ opacity = 1 }: { opacity?: number }) {
  const transparent = opacity < 1
  return (
    <group>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.55]} />
        <meshStandardMaterial color={CHAIR} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Backrest, away from the desk (the seat faces +Z). */}
      <mesh position={[0, 0.85, -0.27]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.07]} />
        <meshStandardMaterial color={CHAIR} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
        <meshStandardMaterial
          color={PALETTE.chairBase}
          metalness={0.6}
          roughness={0.35}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <meshStandardMaterial
          color={PALETTE.chairBase}
          metalness={0.6}
          roughness={0.35}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}

// Monitor and keyboard in front of a seat; the screen shows the person's
// state: lit teal (timer running), lit blue (cards in progress), off (idle,
// or nobody there).
function Screen({ status, dimmed }: { status: MapPerson['status'] | null; dimmed: boolean }) {
  const lit = status !== null && status !== 'IDLE' && !dimmed
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    // A focused screen breathes gently.
    if (ref.current && status === 'FOCUS' && lit) {
      ref.current.emissiveIntensity = 0.75 + Math.sin(clock.elapsedTime * 3) * 0.25
    }
  })
  return (
    <group>
      <mesh position={[0, DESK_HEIGHT + 0.36, 0]} castShadow>
        <boxGeometry args={[0.62, 0.4, 0.04]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* The screen faces the seat (-Z of this group). */}
      <mesh position={[0, DESK_HEIGHT + 0.36, -0.025]}>
        <planeGeometry args={[0.56, 0.34]} />
        <meshStandardMaterial
          ref={ref}
          side={THREE.DoubleSide}
          color={lit ? STATUS_COLOR[status!] : OFF_SCREEN}
          emissive={lit ? STATUS_COLOR[status!] : '#000000'}
          emissiveIntensity={lit ? 0.8 : 0}
        />
      </mesh>
      <mesh position={[0, DESK_HEIGHT + 0.1, 0.03]}>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, DESK_HEIGHT + 0.04, -0.35]}>
        <boxGeometry args={[0.48, 0.02, 0.16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  )
}

// One small floating tile per card in progress (up to three).
function WorkTiles({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.6
    ref.current.position.y = 2.35 + Math.sin(clock.elapsedTime * 2) * 0.06
  })
  const tiles = Math.min(count, 3)
  return (
    <group ref={ref} position={[0, 2.35, 0]}>
      {Array.from({ length: tiles }, (_, i) => {
        const angle = (i / tiles) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.45, i * 0.05, Math.sin(angle) * 0.45]}>
            <boxGeometry args={[0.26, 0.18, 0.03]} />
            <meshStandardMaterial color={STATUS_COLOR.ACTIVE} />
          </mesh>
        )
      })}
    </group>
  )
}

// A red ball above someone with overdue cards.
function OverdueFlag() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 2.95 + Math.sin(clock.elapsedTime * 3) * 0.08
  })
  return (
    <mesh ref={ref} position={[0.35, 2.95, 0]}>
      <sphereGeometry args={[0.17, 16, 12]} />
      <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
    </mesh>
  )
}

// A seat with its person (seated, facing the desk), or an empty chair.
function Seat({
  spot,
  hovered,
  selected,
  dimmed,
  onSelect,
  onHover,
}: {
  spot: Omit<Spot, 'person'> & { person: MapPerson | null }
  hovered: boolean
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const { person, position, facing } = spot
  const bodyRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!bodyRef.current) return
    const target = hovered || selected ? 0.15 : 0
    bodyRef.current.position.y = THREE.MathUtils.damp(bodyRef.current.position.y, target, 10, delta)
  })

  if (!person) {
    return (
      <group position={[position[0], 0, position[1]]} rotation={[0, facing, 0]}>
        <Chair opacity={0.85} />
        <group position={[0, 0, MONITOR_DISTANCE]}>
          <Screen status={null} dimmed />
        </group>
      </group>
    )
  }

  const color = STATUS_COLOR[person.status]
  const opacity = dimmed ? 0.2 : 1
  const working = person.inProgress.length + person.hiddenInProgress
  return (
    <group
      position={[position[0], 0, position[1]]}
      rotation={[0, facing, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onHover(person.id)
        setCursor('pointer')
      }}
      onPointerOut={() => {
        onHover(null)
        setCursor('auto')
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect(person.id)
      }}
    >
      <Chair />
      <group ref={bodyRef}>
        {/* Seated: torso over the chair, head above, arms to the desk. */}
        <mesh position={[0, 0.95, -0.02]} castShadow>
          <capsuleGeometry args={[0.24, 0.42, 6, 14]} />
          <meshStandardMaterial
            color={color}
            roughness={0.5}
            transparent={dimmed}
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color={SKIN} transparent={dimmed} opacity={opacity} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.98, 0.28]} rotation={[Math.PI / 2.6, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.38, 4, 8]} />
            <meshStandardMaterial color={color} transparent={dimmed} opacity={opacity} />
          </mesh>
        ))}
      </group>
      <group position={[0, 0, MONITOR_DISTANCE]}>
        <Screen status={person.status} dimmed={dimmed} />
      </group>

      {!dimmed && working > 0 && <WorkTiles count={working} />}
      {!dimmed && person.overdue > 0 && <OverdueFlag />}
      {(person.isMe || selected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.64, 40]} />
          <meshBasicMaterial color={selected ? color : ME} />
        </mesh>
      )}
    </group>
  )
}

// --- Rooms -----------------------------------------------------------------

const WALL_T = 0.16
const DOOR_WIDTH = 1.6

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.5, 20]} />
        <meshStandardMaterial color={PALETTE.pot} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.42, 16, 12]} />
        <meshStandardMaterial color={PALETTE.leaf} roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 1.2, 0.08]} castShadow>
        <sphereGeometry args={[0.28, 14, 10]} />
        <meshStandardMaterial color={PALETTE.leafDark} roughness={0.9} />
      </mesh>
      <mesh position={[-0.15, 1.12, -0.1]} castShadow>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshStandardMaterial color={PALETTE.leaf} roughness={0.9} />
      </mesh>
    </group>
  )
}

// Windows along the back wall: frame, sill and sky-blue glass, slightly lit.
function Windows({ width, z }: { width: number; z: number }) {
  const count = Math.max(1, Math.floor(width / 3.2))
  const span = width / count
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const x = -width / 2 + span * (i + 0.5)
        return (
          <group key={i} position={[x, 1.45, z]}>
            <mesh>
              <boxGeometry args={[span * 0.62 + 0.12, 1.22, 0.06]} />
              <meshStandardMaterial color={PALETTE.frame} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.035]}>
              <planeGeometry args={[span * 0.62, 1.1]} />
              <meshStandardMaterial
                color={PALETTE.window}
                emissive={PALETTE.window}
                emissiveIntensity={0.35}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[0.04, 1.1, 0.02]} />
              <meshStandardMaterial color={PALETTE.frame} />
            </mesh>
            <mesh position={[0, -0.64, 0.08]}>
              <boxGeometry args={[span * 0.62 + 0.25, 0.05, 0.16]} />
              <meshStandardMaterial color={PALETTE.wall} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// A glass partition from a to b along one axis, with aluminium posts and top
// rail; `gap` leaves a doorway centred on it.
function GlassWall({
  length,
  axis,
  at,
  gap = 0,
}: {
  length: number
  axis: 'x' | 'z'
  at: number
  gap?: number
}) {
  const height = WALL_HEIGHT - 0.1
  const pieces =
    gap > 0
      ? [-1, 1].map((side) => ({ side, len: (length - gap) / 2 }))
      : [{ side: 0, len: length }]
  const place = (offset: number, y: number): [number, number, number] =>
    axis === 'x' ? [offset, y, at] : [at, y, offset]
  const size = (len: number, h: number, t: number): [number, number, number] =>
    axis === 'x' ? [len, h, t] : [t, h, len]
  return (
    <group>
      {pieces.map(({ side, len }) => {
        const center = side === 0 ? 0 : side * (gap / 2 + len / 2)
        const posts = Math.max(1, Math.round(len / 1.6))
        return (
          <group key={side}>
            <mesh position={place(center, height / 2)}>
              <boxGeometry args={size(len, height, 0.03)} />
              <meshStandardMaterial
                color={PALETTE.glass}
                transparent
                opacity={0.22}
                roughness={0.05}
                metalness={0.1}
                depthWrite={false}
              />
            </mesh>
            <mesh position={place(center, height)}>
              <boxGeometry args={size(len, 0.07, 0.07)} />
              <meshStandardMaterial color={PALETTE.frame} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={place(center, 0.05)}>
              <boxGeometry args={size(len, 0.1, 0.07)} />
              <meshStandardMaterial color={PALETTE.frame} metalness={0.5} roughness={0.4} />
            </mesh>
            {Array.from({ length: posts + 1 }, (_, i) => (
              <mesh key={i} position={place(center - len / 2 + (len / posts) * i, height / 2)}>
                <boxGeometry args={size(0.05, height, 0.06)} />
                <meshStandardMaterial color={PALETTE.frame} metalness={0.5} roughness={0.4} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// A department's room: wood floor; the back wall with windows and the left
// wall painted in the department's colour (a cut-away, so the south-east
// camera looks in); glass on the open sides, with the door at the front.
function RoomShell({
  room,
  selected,
  onSelect,
}: {
  room: Room
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { width, depth, color, center } = room
  const floor = useMemo(() => woodFloor(width, depth), [width, depth])
  const accent = useMemo(() => accentPaint(color), [color])
  useEffect(() => () => floor.dispose(), [floor])
  const back = -depth / 2 + WALL_T / 2
  const left = -width / 2 + WALL_T / 2
  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh
        position={[0, 0.03, 0]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onSelect(room.id)
        }}
      >
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>

      {/* Back wall with windows. */}
      <mesh position={[0, WALL_HEIGHT / 2, back]} castShadow receiveShadow>
        <boxGeometry args={[width, WALL_HEIGHT, WALL_T]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.95} />
      </mesh>
      <Windows width={width - 1} z={back + WALL_T / 2} />

      {/* Left wall: the department's accent colour, with a framed picture. */}
      <mesh position={[left, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color={accent} roughness={0.95} />
      </mesh>
      <group position={[left + WALL_T / 2 + 0.03, 1.5, -depth / 6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 0.85, 0.04]} />
          <meshStandardMaterial color="#3b3f46" />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[1.18, 0.73]} />
          <meshStandardMaterial
            color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25)}
          />
        </mesh>
      </group>

      {/* Skirting along both walls. */}
      <mesh position={[0, 0.07, back + WALL_T / 2 + 0.01]}>
        <boxGeometry args={[width, 0.14, 0.03]} />
        <meshStandardMaterial color={PALETTE.baseboard} />
      </mesh>
      <mesh position={[left + WALL_T / 2 + 0.01, 0.07, 0]}>
        <boxGeometry args={[0.03, 0.14, depth]} />
        <meshStandardMaterial color={PALETTE.baseboard} />
      </mesh>

      {/* Glass front (with the door) and right side. */}
      <GlassWall length={width} axis="x" at={depth / 2 - 0.04} gap={DOOR_WIDTH} />
      <GlassWall length={depth} axis="z" at={width / 2 - 0.04} />
      {selected && (
        <mesh position={[0, 0.07, depth / 2 - 0.04]}>
          <boxGeometry args={[width, 0.05, 0.12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}

      {/* Plants in the back corners and by the door. */}
      <Plant position={[-width / 2 + 0.6, 0.06, -depth / 2 + 0.6]} />
      <Plant position={[width / 2 - 0.6, 0.06, -depth / 2 + 0.6]} scale={0.85} />
      <Plant position={[DOOR_WIDTH / 2 + 0.5, 0.06, depth / 2 - 0.55]} scale={0.7} />
    </group>
  )
}

function Office({
  room,
  selected,
  selectedPerson,
  hoveredId,
  isDimmed,
  onSelect,
  onHover,
}: {
  room: Room
  selected: boolean
  selectedPerson: string | null
  hoveredId: string | null
  isDimmed: (person: MapPerson) => boolean
  onSelect: (selection: MapSelection) => void
  onHover: (id: string | null) => void
}) {
  return (
    <group>
      <RoomShell
        room={room}
        selected={selected}
        onSelect={(id) => onSelect({ kind: 'room', id })}
      />
      {room.pods.map((pod: Pod, p) => (
        <group key={p}>
          <Workstation center={pod.center} />
          {pod.seats.map((spot, q) => (
            <Seat
              key={q}
              spot={spot ?? { person: null, ...seatAt(pod.center, q) }}
              hovered={spot?.person.id === hoveredId}
              selected={spot?.person.id === selectedPerson}
              dimmed={spot ? isDimmed(spot.person) : true}
              onSelect={(id) => onSelect({ kind: 'person', id })}
              onHover={onHover}
            />
          ))}
        </group>
      ))}
    </group>
  )
}

// --- Labels ----------------------------------------------------------------
// Labels are plain DOM over the canvas, not drei's <Html>: <Html> mounts a
// React root per label in a layout effect, and under React 19 StrictMode the
// deferred unmount of the first root wipes what the second one drew, so
// labels went missing. Here the scene only projects each anchor to the
// screen every frame and moves its element.

type Anchor = { key: string; position: THREE.Vector3 }

const projected = new THREE.Vector3()

function LabelProjector({
  anchors,
  nodes,
}: {
  anchors: Anchor[]
  nodes: RefObject<Map<string, HTMLElement>>
}) {
  useFrame(({ camera, size }) => {
    for (const anchor of anchors) {
      const el = nodes.current.get(anchor.key)
      if (!el) continue
      projected.copy(anchor.position).project(camera)
      // Behind the camera or far off screen: hide.
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.3 && Math.abs(projected.y) < 1.3
      el.style.visibility = visible ? 'visible' : 'hidden'
      if (!visible) continue
      const x = ((projected.x + 1) / 2) * size.width
      const y = ((1 - projected.y) / 2) * size.height
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }
  })
  return null
}

function roomSummary(room: Room) {
  const of = (status: MapPerson['status']) =>
    room.spots.filter((s) => s.person.status === status).length
  const focus = of('FOCUS')
  const idle = of('IDLE')
  return [
    `${room.spots.length} ${room.spots.length === 1 ? 'pessoa' : 'pessoas'}`,
    focus > 0 && `${focus} em foco`,
    idle > 0 && `${idle} sem atividade`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// --- Camera ----------------------------------------------------------------

function CameraRig({
  rooms,
  selection,
  commandsRef,
  home,
}: {
  rooms: Room[]
  selection: MapSelection
  commandsRef: RefObject<MapCameraCommands | null>
  home: { target: THREE.Vector3; position: THREE.Vector3 }
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as unknown as Controls | null
  const goal = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null)

  // The user grabbing the camera cancels any flight.
  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      goal.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useEffect(() => {
    if (!controls || !selection) return
    const offset = (distance: number) =>
      camera.position.clone().sub(controls.target).setLength(distance)
    if (selection.kind === 'person') {
      const spot = rooms.flatMap((r) => r.spots).find((s) => s.person.id === selection.id)
      if (!spot) return
      const target = new THREE.Vector3(spot.position[0], 1, spot.position[1])
      goal.current = { target, position: target.clone().add(offset(14)) }
    } else {
      const room = rooms.find((r) => r.id === selection.id)
      if (!room) return
      const target = new THREE.Vector3(room.center[0], 0, room.center[1])
      const span = Math.max(room.width, room.depth)
      goal.current = { target, position: target.clone().add(offset(span * 1.9 + 10)) }
    }
  }, [selection, rooms, camera, controls])

  useEffect(() => {
    commandsRef.current = {
      zoom: (factor) => {
        if (!controls) return
        const offset = camera.position.clone().sub(controls.target)
        offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, 5, 400))
        goal.current = {
          target: controls.target.clone(),
          position: controls.target.clone().add(offset),
        }
      },
      rotate: (angle) => {
        if (!controls) return
        const offset = camera.position.clone().sub(controls.target)
        offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle)
        goal.current = {
          target: controls.target.clone(),
          position: controls.target.clone().add(offset),
        }
      },
      reset: () => {
        goal.current = { target: home.target.clone(), position: home.position.clone() }
      },
    }
  }, [camera, controls, commandsRef, home])

  useFrame((_, delta) => {
    if (!controls || !goal.current) return
    const t = 1 - Math.exp(-delta * 4)
    controls.target.lerp(goal.current.target, t)
    camera.position.lerp(goal.current.position, t)
    if (
      controls.target.distanceTo(goal.current.target) < 0.05 &&
      camera.position.distanceTo(goal.current.position) < 0.05
    ) {
      goal.current = null
    }
  })
  return null
}

// --- Scene -----------------------------------------------------------------

// The building's floor around the rooms: light porcelain tiles.
function Corridors({ size }: { size: number }) {
  const texture = useMemo(() => tileFloor(size), [size])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} roughness={0.35} />
    </mesh>
  )
}

export function TeamMapScene({ rooms, selection, onSelect, isDimmed, commandsRef }: Props) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null)
  const size = extent(rooms)
  // Home: the whole office from the south-east and above, aimed a little
  // north of the centre so the rooms sit below the floating cards.
  const home = useMemo(() => {
    const distance = size * 1.7 + 12
    return {
      // The view from the south-east pushes the west rooms off the left
      // edge; aiming a little west recentres them.
      target: new THREE.Vector3(-size * 0.12, 0, -size * 0.22),
      position: new THREE.Vector3(distance * 0.55, distance * 0.8, distance * 0.7),
    }
  }, [size])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  useEffect(() => () => setCursor('auto'), [])

  const selectedPerson = selection?.kind === 'person' ? selection.id : null
  const selectedRoom = selection?.kind === 'room' ? selection.id : null
  const spots = useMemo(() => rooms.flatMap((r) => r.spots), [rooms])
  // The chip follows the pointer; the selected person is in the side panel.
  const chipSpot = spots.find((s) => s.person.id === hoveredId && !isDimmed(s.person)) ?? null
  const anchors = useMemo<Anchor[]>(
    () => [
      // Each room's sign hangs at the middle of its open front.
      ...rooms.map((room) => ({
        key: `room:${room.id}`,
        position: new THREE.Vector3(room.center[0], 0.4, room.center[1] + room.depth / 2),
      })),
      ...(chipSpot
        ? [
            {
              key: 'chip',
              position: new THREE.Vector3(chipSpot.position[0], 2.9, chipSpot.position[1]),
            },
          ]
        : []),
    ],
    [rooms, chipSpot],
  )
  const register = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el)
    else nodes.current.delete(key)
  }

  return (
    <div
      className="team-map-scene"
      onPointerDown={(e) => {
        pointerDown.current = { x: e.clientX, y: e.clientY }
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: home.position.toArray(), fov: 32, near: 0.5, far: 2000 }}
        onPointerMissed={(e) => {
          // Only a real click clears the selection, not the end of a drag.
          const start = pointerDown.current
          if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) onSelect(null)
        }}
      >
        <color attach="background" args={[PALETTE.background]} />
        <fog attach="fog" args={[PALETTE.background, size * 3, size * 7 + 120]} />
        {/* Warm daylight: a soft sky, and the sun coming in from the south-east. */}
        <hemisphereLight args={['#fffaf2', '#d9cbb7', 1.05]} />
        <ambientLight intensity={0.15} color="#ffe9d1" />
        <directionalLight
          position={[size * 0.8, size * 1.6, size * 1.1]}
          color="#fff3e0"
          intensity={1.55}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-size - 10}
          shadow-camera-right={size + 10}
          shadow-camera-top={size + 10}
          shadow-camera-bottom={-size - 10}
          shadow-camera-far={size * 6 + 100}
          shadow-bias={-0.0005}
        />

        {/* The building's floor, with the corridors between rooms. */}
        <Corridors size={size * 4 + 60} />

        {rooms.map((room) => (
          <Office
            key={room.id}
            room={room}
            selected={room.id === selectedRoom}
            selectedPerson={selectedPerson}
            hoveredId={hoveredId}
            isDimmed={isDimmed}
            onSelect={onSelect}
            onHover={setHoveredId}
          />
        ))}

        <OrbitControls
          makeDefault
          target={home.target.toArray()}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={size * 6 + 80}
          maxPolarAngle={Math.PI / 2.2}
          screenSpacePanning={false}
        />
        <CameraRig rooms={rooms} selection={selection} commandsRef={commandsRef} home={home} />
        <LabelProjector anchors={anchors} nodes={nodes} />
      </Canvas>

      <div className="team-map-labels">
        {rooms.map((room) => (
          <button
            key={room.id}
            ref={register(`room:${room.id}`)}
            type="button"
            className={`team-map-room-label${
              room.id === selectedRoom ? ' team-map-room-label--selected' : ''
            }`}
            style={{ '--room-color': room.color } as CSSProperties}
            onClick={() => onSelect({ kind: 'room', id: room.id })}
          >
            <strong>{room.name}</strong>
            <span>{roomSummary(room)}</span>
          </button>
        ))}
        {chipSpot && (
          <div
            ref={register('chip')}
            className="team-map-chip"
            style={{ '--chip-color': STATUS_COLOR[chipSpot.person.status] } as CSSProperties}
          >
            <strong>
              {chipSpot.person.name}
              {chipSpot.person.isMe && ' (você)'}
            </strong>
            <span>{STATUS_LABEL[chipSpot.person.status]}</span>
          </div>
        )}
      </div>
    </div>
  )
}
