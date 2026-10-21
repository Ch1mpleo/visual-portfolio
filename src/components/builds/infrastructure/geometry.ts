// The MIT-licensed Anatomy kit supplies real solids and the shared camera.
import * as k from './iso-kit'
import type { Architecture, ArchitectureNode } from '../../../data/projectArchitectures'
import { infrastructureModel, connectionPath } from './model'

export function infrastructureGeometry(architecture: Architecture) {
  const model = infrastructureModel(architecture)
  const P: k.Projection = { origin: [0, 0], scale: 1.02, azimuth: 48, elevation: 30 }
  const pt = (x: number, y: number, z: number) => k.iso([x, y, z], P)
  const plan = (x: number, y: number, w: number, d: number, r = 1): k.Plan => ({ x, y, w, d, r })
  const slab = (shape: k.Plan, z: number, h: number, tone: k.Tone = 'mid', inner = '', className = '') => k.solidSvg(k.slabOf(shape, z, h, P, 5, Math.min(.7, h / 3)), { tone, inner, className })
  const line = (d: string, tone: k.LineTone = 'lo', free = false) => k.lineSvg(d, { tone, free })
  const dots = (pts: k.Flat[]) => k.dotsSvg(pts, { size: .65, tone: 'mid' })
  const face = (x: number, y: number, z: number, w: number, h: number, cls: string) => `<path class="${cls}" d="${k.pathOf([pt(x, y, z), pt(x + w, y, z), pt(x + w, y, z + h), pt(x, y, z + h)], true)}"/>`
  const slot = (x: number, y: number, z: number, w: number, h: number) => face(x, y, z, w, h, 'infra-slot')
  const faceRules = (x: number, y: number, z: number, count: number, w: number) => Array.from({ length: count }, (_, i) => line(k.pathOf([pt(x, y, z + i * 5), pt(x + w - i % 2 * 8, y, z + i * 5)]), 'lo', true)).join('')
  const fasteners = (shape: k.Plan, z: number) => dots(k.corners(shape, 3).map(([x, y]) => pt(x, y, z)))
  function plinth(w = 88, d = 58) {
    const shape = plan(-w / 2, -d / 2, w, d, 3)
    return `<path class="iso-halo" d="${k.haloOf(shape, -5, 3, P)}"/>` +
      slab(shape, -3, 3, 'lo') + line(k.planOutline(k.insetPlan(shape, 3), 0, P), 'faint') +
      fasteners(shape, 0)
  }
  function monitor(mode: 'browser' | 'scope' = 'browser') {
    const out = [plinth(104, 76), slab(plan(-17, -4, 34, 19, 3), 0, 3, 'lo'), slab(plan(-4, 0, 8, 8), 3, 16, 'mid')]
    const shell = plan(-43, -8, 86, 14, 3)
    out.push(slab(shell, 19, 49, 'hi', '', 'infra-subject'))
    out.push(face(-37, 6.1, 26, 74, 35, 'infra-screen'))
    out.push(face(-34, 6.2, 53, 68, 5, 'infra-screen-bar'))
    if (mode === 'scope') {
      const pts = [[-37, 35], [-23, 35], [-17, 47], [-9, 31], [0, 43], [10, 35], [37, 35]]
      out.push(line(k.pathOf(pts.map(([x, z]) => pt(x, 6.3, z))), 'hi'))
    } else {
      out.push(face(-32, 6.3, 31, 16, 17, 'infra-screen-tile'))
      out.push(faceRules(-10, 6.3, 33, 3, 35))
    }
    const keyboard = plan(-38, 23, 76, 22, 2)
    out.push(slab(keyboard, 0, 3, 'mid'))
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
      out.push(line(k.planOutline(plan(-33 + col * 7.5, 26 + row * 5.4, col === 8 ? 6 : 5.7, 3.4, .5), 3, P, 3), 'faint'))
    }
    return out.join('')
  }
  function phone() {
    const out = [plinth(60, 58), slab(plan(-20, -13, 40, 28, 3), 0, 5, 'lo')]
    out.push(slab(plan(-17, -6, 34, 11, 3), 5, 65, 'hi', '', 'infra-subject'))
    out.push(face(-13, 5.1, 13, 26, 50, 'infra-screen'))
    out.push(face(-5, 5.2, 60, 10, 1.8, 'infra-screen-bar'))
    for (const [x, z] of [[-9, 42], [3, 42], [-9, 28]]) out.push(face(x, 5.3, z, 7, 7, 'infra-screen-tile'))
    out.push(face(-7, 5.3, 18, 14, 5, 'infra-screen-tile'))
    return out.join('')
  }
  function cabinet(kind: 'server' | 'database' | 'storage') {
    const out = [plinth(94, 70)]
    const shape = plan(-32, -23, 64, 42, 2)
    out.push(slab(shape, 0, kind === 'server' ? 66 : 47, 'mid', '', 'infra-subject'))
    const rows = kind === 'server' ? 4 : 3
    for (let i = 0; i < rows; i++) {
      const z = 6 + i * 14
      out.push(slab(plan(-29, 19, 58, 3, .6), z, 10, 'hi'))
      out.push(face(-24, 22.1, z + 3, 4, 4, 'infra-led'))
      out.push(face(-14, 22.1, z + 4, 29, 2, 'infra-slot'))
      out.push(face(21, 22.1, z + 2, 3, 6, 'infra-slot'))
    }
    const top = kind === 'server' ? 66 : 47
    out.push(fasteners(shape, top))
    for (let i = 0; i < 5; i++) out.push(line(k.planOutline(plan(-22 + i * 9, -15, 3, 23, .7), top, P), 'faint'))
    return out.join('')
  }
  function records() {
    const out = [plinth(112, 82)]
    out.push(slab(plan(-45, -25, 90, 50, 3), 0, 32, 'mid', '', 'infra-subject'))
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      const x = -41 + col * 43, z = 4 + row * 14
      out.push(slab(plan(x, 25, 39, 4, .8), z, 11, 'hi'))
      out.push(face(x + 5, 29.1, z + 4, 24, 2, 'infra-slot'))
      out.push(face(x + 31, 29.1, z + 4, 3, 3, 'infra-led'))
    }
    for (let i = 0; i < 5; i++) out.push(line(k.planOutline(plan(-34 + i * 15, -16, 7, 30, 1), 32, P), 'faint'))
    out.push(fasteners(plan(-45, -25, 90, 50), 32))
    return out.join('')
  }
  function compute() {
    const out = [plinth(98, 66)]
    const board = plan(-38, -22, 76, 44, 2)
    out.push(slab(board, 0, 4, 'lo'), fasteners(board, 4))
    out.push(slab(plan(-22, -16, 44, 31, 2), 4, 8, 'hi', '', 'infra-subject'))
    for (let i = 0; i < 5; i++) out.push(slab(plan(-18 + i * 8, -13, 3, 25, .5), 12, 7, 'mid'))
    for (const x of [-31, 28]) for (const y of [-14, -5, 4, 13]) out.push(slab(plan(x, y, 4, 4, .4), 4, 2, 'lo'))
    return out.join('')
  }
  function queue() {
    const out = [plinth(104, 72)]
    for (const y of [-20, 21]) out.push(slab(plan(-42, y, 84, 4), 0, 4, 'mid'))
    for (const x of [-43, 39]) out.push(slab(plan(x, -20, 4, 45), 4, 3, 'mid'))
    for (let i = 0; i < 3; i++) {
      const card = plan(-32 + i * 25, -12, 18, 31, 1)
      out.push(slab(card, 4, 8 + i * 4, i === 1 ? 'hi' : 'mid', '', i === 1 ? 'infra-subject' : ''))
      out.push(line(k.planOutline(k.insetPlan(card, 3), 12 + i * 4, P), 'lo'))
    }
    return out.join('')
  }
  function switchboard() {
    const out = [plinth(106, 66)]
    const box = plan(-42, -21, 84, 42, 2)
    out.push(slab(box, 0, 19, 'mid', '', 'infra-subject'), fasteners(box, 19))
    for (let col = 0; col < 6; col++) {
      out.push(face(-34 + col * 12, 21.1, 6, 8, 8, 'infra-port'))
      out.push(face(-32 + col * 12, 21.2, 7, 4, 3, 'infra-slot'))
    }
    for (let i = 0; i < 5; i++) out.push(line(k.planOutline(plan(-30 + i * 12, -12, 7, 14, .8), 19, P), 'faint'))
    return out.join('')
  }
  function media() {
    const out = [plinth(106, 78)]
    out.push(slab(plan(-39, -24, 78, 49, 3), 0, 14, 'mid', '', 'infra-subject'))
    out.push(slab(plan(-32, -18, 64, 35, 1), 14, 2, 'hi'))
    for (let i = 0; i < 3; i++) {
      const frame = plan(-27 + i * 19, -12, 15, 22, .7)
      out.push(line(k.planOutline(frame, 16, P), 'mid'))
      for (const y of [-10, 7]) out.push(dots([pt(frame.x + 3, y, 16), pt(frame.x + 11, y, 16)]))
    }
    out.push(face(-29, 25.1, 4, 42, 5, 'infra-screen'), face(20, 25.1, 4, 10, 5, 'infra-led'))
    return out.join('')
  }
  function books() {
    const out = [plinth(95, 70)]
    for (let i = 0; i < 3; i++) {
      const book = plan(-34 + i * 2, -24 - i * 2, 67, 45, 1)
      out.push(slab(book, i * 7, 6, i === 2 ? 'hi' : 'mid', '', i === 2 ? 'infra-subject' : ''))
      out.push(line(k.lineOnTop([book.x + 5, book.y], [book.x + 5, book.y + book.d], i * 7 + 6, P), 'lo'))
    }
    for (let i = 0; i < 3; i++) out.push(line(k.lineOnTop([-18, -12 + i * 7], [22 - i * 6, -12 + i * 7], 20, P), 'lo', true))
    return out.join('')
  }
  function delivery() {
    const out = [plinth(116, 70)]
    out.push(slab(plan(-48, -17, 96, 36, 2), 0, 3, 'lo'))
    for (let i = 0; i < 3; i++) {
      const box = plan(-42 + i * 31, -12, 23, 27, 1)
      out.push(slab(box, 3, 14 + i * 6, i === 1 ? 'hi' : 'mid', '', i === 1 ? 'infra-subject' : ''))
      out.push(line(k.planOutline(k.insetPlan(box, 3), 17 + i * 6, P), 'lo'))
      out.push(face(box.x + 4, 15.1, 7, 15, 4, 'infra-port'))
    }
    return out.join('')
  }
  function projector() {
    const out = [plinth(100, 72)]
    out.push(slab(plan(-33, -23, 66, 45, 3), 0, 28, 'mid', '', 'infra-subject'))
    out.push(slab(plan(13, 22, 18, 10, 2), 9, 16, 'hi'))
    out.push(face(16, 32.1, 12, 12, 10, 'infra-screen'))
    for (let i = 0; i < 5; i++) out.push(line(k.planOutline(plan(-25 + i * 9, -14, 3, 23, .6), 28, P), 'faint'))
    return out.join('')
  }
  const device = (node: ArchitectureNode) => {
    switch (node.kind) {
      case 'clients': return `<g transform="translate(-15 -8)">${monitor()}</g><g transform="translate(60 20) scale(.72)">${phone()}</g>`
      case 'terminal': return monitor()
      case 'phone': return phone()
      case 'database': return records()
      case 'server': case 'storage': return cabinet(node.kind)
      case 'worker': return queue()
      case 'compute': return compute()
      case 'switch': return switchboard()
      case 'media': return media()
      case 'delivery': return delivery()
      case 'scope': return monitor('scope')
      case 'book': return books()
      case 'projector': return projector()
    }
  }

  const connections = model.connections.map(edge => ({
    ...edge, d: connectionPath(edge.fromNode.at, edge.toNode.at, false, 0, edge.fromNode.kind === 'clients'),
  }))
  return { connections, devices: model.nodes.map(node => ({ node, body: device(node) })) }
}
