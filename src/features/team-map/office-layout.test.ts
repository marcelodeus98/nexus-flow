import { describe, expect, it } from 'vitest'
import type { MapPerson } from './api'
import { buildRooms, extent, roomSize } from './office-layout'

const person = (id: string, departmentId: string | null, over: Partial<MapPerson> = {}) =>
  ({
    id,
    name: id,
    jobTitle: null,
    departmentId,
    teams: [],
    isMe: false,
    status: 'IDLE',
    timer: null,
    inProgress: [],
    hiddenInProgress: 0,
    openCards: 0,
    overdue: 0,
    todaySeconds: 0,
    lastActivityAt: null,
    projectIds: [],
    ...over,
  }) as MapPerson

const people = (department: string, count: number) =>
  Array.from({ length: count }, (_, i) => person(`${department}${i}`, department))

describe('office layout', () => {
  it('seats four people per workstation, with empty seats left over', () => {
    const [room] = buildRooms({
      departments: [{ id: 'd1', name: 'Dev', color: '#2563EB' }],
      people: people('d1', 6),
    })
    expect(room.pods).toHaveLength(2)
    expect(room.pods[0].seats.every(Boolean)).toBe(true)
    expect(room.pods[1].seats.filter(Boolean)).toHaveLength(2)
    expect(room.spots).toHaveLength(6)
  })

  it('keeps every seat inside its room and apart from the others', () => {
    for (const count of [1, 4, 9, 30]) {
      const [room] = buildRooms({
        departments: [{ id: 'd', name: 'D', color: '#000' }],
        people: people('d', count),
      })
      for (const [i, spot] of room.spots.entries()) {
        expect(Math.abs(spot.position[0] - room.center[0])).toBeLessThan(room.width / 2 - 0.5)
        expect(Math.abs(spot.position[1] - room.center[1])).toBeLessThan(room.depth / 2 - 0.5)
        for (const other of room.spots.slice(0, i)) {
          expect(
            Math.hypot(spot.position[0] - other.position[0], spot.position[1] - other.position[1]),
          ).toBeGreaterThan(2)
        }
      }
    }
  })

  it('turns each seat towards its workstation', () => {
    const [room] = buildRooms({
      departments: [{ id: 'd', name: 'D', color: '#000' }],
      people: people('d', 4),
    })
    const pod = room.pods[0].center
    for (const spot of room.spots) {
      // Facing yaw points the +Z of the seat at the pod centre.
      const dx = Math.sin(spot.facing)
      const dz = Math.cos(spot.facing)
      const toCenter = [pod[0] - spot.position[0], pod[1] - spot.position[1]]
      expect(dx * toCenter[0] + dz * toCenter[1]).toBeGreaterThan(0)
    }
  })

  it('makes one room per department with people, plus "Sem departamento"', () => {
    const rooms = buildRooms({
      departments: [
        { id: 'd1', name: 'Desenvolvimento', color: '#2563EB' },
        { id: 'd2', name: 'Vazio', color: '#000000' },
      ],
      people: [person('ana', 'd1'), person('caio', null)],
    })
    expect(rooms.map((r) => r.name)).toEqual(['Desenvolvimento', 'Sem departamento'])
  })

  it('puts the viewer at the first seat of their room', () => {
    const [room] = buildRooms({
      departments: [{ id: 'd1', name: 'Dev', color: '#2563EB' }],
      people: [person('ana', 'd1'), person('zé', 'd1', { isMe: true })],
    })
    expect(room.spots[0].person.id).toBe('zé')
  })

  it('leaves corridors between rooms of any size', () => {
    const rooms = buildRooms({
      departments: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, color: '#000' })),
      people: ['a', 'b', 'c', 'd', 'e'].flatMap((d, n) => people(d, 1 + n * 5)),
    })
    for (let i = 0; i < rooms.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = rooms[i]
        const b = rooms[j]
        const apartX = Math.abs(a.center[0] - b.center[0]) >= (a.width + b.width) / 2 + 4
        const apartZ = Math.abs(a.center[1] - b.center[1]) >= (a.depth + b.depth) / 2 + 4
        expect(apartX || apartZ).toBe(true)
      }
    }
    expect(extent(rooms)).toBeGreaterThan(20)
    expect(roomSize(0).pods).toBe(1)
  })
})
