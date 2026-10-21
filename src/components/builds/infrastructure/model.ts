import type { Architecture, ArchitectureEdge } from '../../../data/projectArchitectures'

export const edgeId = (edge: ArchitectureEdge) => `${edge.from}-${edge.to}`
export function infrastructureModel(architecture: Architecture) {
  const byId = new Map(architecture.nodes.map(node => [node.id, node]))
  return { nodes: architecture.nodes, connections: architecture.edges.map(edge => ({
    ...edge, id: edgeId(edge), fromNode: byId.get(edge.from)!, toNode: byId.get(edge.to)!,
  })) }
}
export type Point = readonly [number, number]

/** A few open, curved tracks; on narrow screens they move to the left margin. */
export function connectionPath(from: Point, to: Point, stacked = false, index = 0, wide = false) {
  if (stacked) {
    const x = from[0] - 61, y = from[1] - 18, endY = to[1] - 18
    const lane = 10 + index * 11, r = Math.min(12, Math.max(3, (x - lane) / 2))
    return `M${x} ${y}H${lane + r}Q${lane} ${y} ${lane} ${y + r}V${endY - r}Q${lane} ${endY} ${lane + r} ${endY}H${to[0] - 61}`
  }
  const direction = to[0] > from[0] ? 1 : -1
  const x = from[0] + (wide ? 104 : 82) * direction, y = from[1] - 18
  const tx = to[0] - 82 * direction, ty = to[1] - 18
  const handle = Math.max(30, Math.abs(tx - x) * .55)
  return `M${x} ${y}C${x + handle * direction} ${y} ${tx - handle * direction} ${ty} ${tx} ${ty}`
}

/** Keep an anchored inspection bubble inside the visible canvas. */
export function bubblePosition(anchor: { x: number; y: number; w: number; h: number }, viewport: { w: number; h: number }, bubble: { w: number; h: number }) {
  const margin = 12
  const right = anchor.x + anchor.w + 16
  const left = anchor.x - bubble.w - 16
  const x = right + bubble.w <= viewport.w - margin ? right : left >= margin ? left : Math.max(margin, Math.min(anchor.x + anchor.w / 2 - bubble.w / 2, viewport.w - bubble.w - margin))
  const y = Math.max(margin, Math.min(anchor.y + anchor.h / 2 - bubble.h / 2, viewport.h - bubble.h - margin))
  return { x, y }
}
