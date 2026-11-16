import * as THREE from 'three'

// The office's look, drawn in code (no image files to load): wood plank
// floors for the rooms, light porcelain tiles for the corridors, and the
// palette of a real open-plan office.

export const PALETTE = {
  background: '#efe9e1', // warm stone, like daylight on plaster
  wall: '#f6f1e9', // warm white paint
  baseboard: '#8a6a4f', // wooden skirting
  window: '#bfe0f2', // sky through the glass
  frame: '#d5d9de', // anodised aluminium
  glass: '#d9eef7',
  desk: '#c19a6b', // oak desktop
  deskLeg: '#f1f1ef', // white powder-coated steel
  partition: '#c9d2c5', // sage fabric panel
  chair: '#2f3640', // black office chair
  chairBase: '#8d949c',
  pot: '#e9e4dc',
  leaf: '#4f8a4b',
  leafDark: '#3c6e3a',
  skin: '#e9c9a8',
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

// A seeded random, so the planks look the same on every render.
function random(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Oak planks, staggered, each a slightly different shade. One tile covers
// 4 m × 4 m of floor.
function woodTexture() {
  return canvasTexture(512, (ctx) => {
    const rand = random(7)
    const rows = 8
    const h = 512 / rows
    for (let row = 0; row < rows; row++) {
      let x = -rand() * 256
      while (x < 512) {
        const length = 180 + rand() * 200
        const shade = 0.88 + rand() * 0.2
        const r = Math.round(196 * shade)
        const g = Math.round(158 * shade)
        const b = Math.round(112 * shade)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(x, row * h, length, h)
        // Grain: a few faint streaks along the plank.
        ctx.strokeStyle = `rgba(90,60,30,${0.06 + rand() * 0.06})`
        ctx.lineWidth = 1
        for (let i = 0; i < 4; i++) {
          const y = row * h + 6 + rand() * (h - 12)
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.bezierCurveTo(x + length / 3, y + 3, x + (2 * length) / 3, y - 3, x + length, y)
          ctx.stroke()
        }
        // The seam between planks.
        ctx.fillStyle = 'rgba(70,45,25,0.35)'
        ctx.fillRect(x, row * h, 2, h)
        x += length
      }
      ctx.fillStyle = 'rgba(70,45,25,0.3)'
      ctx.fillRect(0, row * h, 512, 2)
    }
  })
}

// Large light porcelain tiles with thin grout lines. One tile per metre.
function tileTexture() {
  return canvasTexture(256, (ctx) => {
    ctx.fillStyle = '#e4ddd3'
    ctx.fillRect(0, 0, 256, 256)
    const rand = random(3)
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const shade = 0.97 + rand() * 0.05
        ctx.fillStyle = `rgb(${Math.round(228 * shade)},${Math.round(221 * shade)},${Math.round(211 * shade)})`
        ctx.fillRect(i * 128 + 2, j * 128 + 2, 124, 124)
      }
    }
    ctx.fillStyle = 'rgba(150,140,128,0.5)'
    ctx.fillRect(0, 0, 256, 2)
    ctx.fillRect(0, 128, 256, 2)
    ctx.fillRect(0, 0, 2, 256)
    ctx.fillRect(128, 0, 2, 256)
  })
}

let wood: THREE.CanvasTexture | null = null
let tile: THREE.CanvasTexture | null = null

// A wood floor texture sized for a width × depth room (shared image, own
// repeat), and the corridor tiles for a square of `size` metres.
export function woodFloor(width: number, depth: number) {
  wood ??= woodTexture()
  const texture = wood.clone()
  texture.needsUpdate = true
  texture.repeat.set(width / 4, depth / 4)
  return texture
}

export function tileFloor(size: number) {
  tile ??= tileTexture()
  const texture = tile.clone()
  texture.needsUpdate = true
  texture.repeat.set(size / 2, size / 2)
  return texture
}

// The department's colour as wall paint: softened so it reads as an accent
// wall, not a sign.
export function accentPaint(color: string) {
  return new THREE.Color(color).lerp(new THREE.Color(PALETTE.wall), 0.45)
}
