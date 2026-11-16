import type { MapPerson, PersonStatus, TeamMap } from './api'

// Where everything sits in the 3D office. Each department is a room; inside
// it, people sit at cross-shaped workstations of four L desks ("ilhas de
// mesa", as in an open-plan office). Rooms are laid out in a grid with
// corridors between them. Units are metres, Y up, the camera looks from the
// south-east (+X, +Z). Pure functions, so the layout is tested without WebGL.

export const STATUS_COLOR: Record<PersonStatus, string> = {
  FOCUS: '#0f9b8e', // brand teal: timer running
  ACTIVE: '#2563eb', // blue: cards in progress
  IDLE: '#94a3b8', // slate: nothing in progress
}

export const STATUS_LABEL: Record<PersonStatus, string> = {
  FOCUS: 'Em foco',
  ACTIVE: 'Em atividade',
  IDLE: 'Sem atividade',
}

export const NO_DEPARTMENT = { id: 'none', name: 'Sem departamento', color: '#64748b' }

// A workstation ("ilha"): four seats, one per quadrant, facing the centre.
export const POD_SEATS = 4
export const POD_SIZE = 6.8
// Seat distance from the pod centre along each axis.
export const SEAT_OFFSET = 1.45
// Quadrant signs, in seating order.
export const QUADRANTS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
]

const ROOM_MARGIN = 1.2 // between the walls and the pods
const ROOM_FRONT = 2 // extra floor at the open front, for the door and sign
const CORRIDOR = 5

export type Spot = {
  person: MapPerson
  position: [number, number]
  // Yaw that turns the seat (and the person) to face the pod centre.
  facing: number
}

export type Pod = {
  center: [number, number]
  // One entry per quadrant; null is an empty seat.
  seats: (Spot | null)[]
}

export type Room = {
  id: string
  name: string
  color: string
  center: [number, number]
  width: number // along X
  depth: number // along Z
  pods: Pod[]
  spots: Spot[]
}

function grid(count: number) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) }
}

// Floor size of a room for `people`: whole workstations, at least one.
export function roomSize(people: number) {
  const pods = Math.max(1, Math.ceil(people / POD_SEATS))
  const { columns, rows } = grid(pods)
  return {
    pods,
    columns,
    width: columns * POD_SIZE + 2 * ROOM_MARGIN,
    depth: rows * POD_SIZE + 2 * ROOM_MARGIN + ROOM_FRONT,
  }
}

// Seat i of a pod centred at `center`.
export function seatAt(center: [number, number], i: number): Omit<Spot, 'person'> {
  const [sx, sz] = QUADRANTS[i]
  const x = center[0] + sx * SEAT_OFFSET
  const z = center[1] + sz * SEAT_OFFSET
  return { position: [x, z], facing: Math.atan2(-sx, -sz) }
}

// People grouped by department (in the departments' order, "Sem
// departamento" last), seated four per workstation, rooms in a grid.
export function buildRooms(map: Pick<TeamMap, 'departments' | 'people'>): Room[] {
  const groups = [...map.departments, NO_DEPARTMENT]
    .map((department) => ({
      ...department,
      people: map.people
        .filter((p) => (p.departmentId ?? NO_DEPARTMENT.id) === department.id)
        // Stable seats: whoever is "me" first, then by name.
        .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.people.length > 0)
  const sizes = groups.map((g) => roomSize(g.people.length))

  // Column widths and row depths of the room grid, so rooms never overlap.
  const { columns, rows } = grid(groups.length)
  const colWidth = Array.from({ length: columns }, (_, c) =>
    Math.max(0, ...sizes.filter((_, i) => i % columns === c).map((s) => s.width)),
  )
  const rowDepth = Array.from({ length: rows }, (_, r) =>
    Math.max(0, ...sizes.filter((_, i) => Math.floor(i / columns) === r).map((s) => s.depth)),
  )
  const totalWidth = colWidth.reduce((a, b) => a + b, 0) + CORRIDOR * (columns - 1)
  const totalDepth = rowDepth.reduce((a, b) => a + b, 0) + CORRIDOR * (rows - 1)
  const offset = (sizes: number[], index: number) =>
    sizes.slice(0, index).reduce((a, b) => a + b + CORRIDOR, 0) + sizes[index] / 2

  return groups.map((group, i) => {
    const size = sizes[i]
    const col = i % columns
    const row = Math.floor(i / columns)
    const center: [number, number] = [
      offset(colWidth, col) - totalWidth / 2,
      offset(rowDepth, row) - totalDepth / 2,
    ]
    // Pods from the back-left corner; the open front keeps the extra floor.
    const left = center[0] - size.width / 2 + ROOM_MARGIN
    const back = center[1] - size.depth / 2 + ROOM_MARGIN
    const spots: Spot[] = []
    const pods: Pod[] = Array.from({ length: size.pods }, (_, p) => {
      const podCenter: [number, number] = [
        left + (p % size.columns) * POD_SIZE + POD_SIZE / 2,
        back + Math.floor(p / size.columns) * POD_SIZE + POD_SIZE / 2,
      ]
      const seats = QUADRANTS.map((_, q) => {
        const person = group.people[p * POD_SEATS + q]
        if (!person) return null
        const spot = { person, ...seatAt(podCenter, q) }
        spots.push(spot)
        return spot
      })
      return { center: podCenter, seats }
    })
    return {
      id: group.id,
      name: group.name,
      color: group.color,
      center,
      width: size.width,
      depth: size.depth,
      pods,
      spots,
    }
  })
}

// How far the rooms reach from the centre: frames the home camera.
export function extent(rooms: Room[]): number {
  return Math.max(
    12,
    ...rooms.map((r) => Math.hypot(r.center[0], r.center[1]) + Math.hypot(r.width, r.depth) / 2),
  )
}
