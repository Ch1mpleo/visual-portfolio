import type { Architecture, ArchitectureEdge, ArchitectureNetwork } from '../../../data/projectArchitectures'

export const edgeId = (edge: ArchitectureEdge) => `${edge.from}-${edge.to}`
export function infrastructureModel(architecture: Architecture) {
  const byId = new Map(architecture.nodes.map(node => [node.id, node]))
  return { nodes: architecture.nodes, connections: architecture.edges.map(edge => ({
    ...edge, id: edgeId(edge), fromNode: byId.get(edge.from)!, toNode: byId.get(edge.to)!,
  })) }
}
export type Point = readonly [number, number]

/** Leave room for device labels, with a quiet network heading and footnote. */
export function networkBounds(network: ArchitectureNetwork, positions: ReadonlyMap<string, Point>, width: number, stacked = false) {
  const members = network.nodeIds.map(id => positions.get(id)!)
  const left = stacked ? 8 : Math.min(...members.map(point => point[0])) - 136
  const right = stacked ? width - 8 : Math.max(...members.map(point => point[0])) + 136
  const top = Math.min(...members.map(point => point[1])) - 145
  const bottom = Math.max(...members.map(point => point[1])) + (stacked ? 95 : 190)
  return { left, top, width: right - left, height: bottom - top }
}

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

/** Prefer free space beside the object, then above/below, within the visible viewer. */
export function bubblePosition(anchor: { x: number; y: number; w: number; h: number }, viewport: { w: number; h: number }, bubble: { w: number; h: number }) {
  const margin = 12, gap = 22
  const clamp = (value: number, size: number, limit: number) => Math.max(margin, Math.min(value, limit - size - margin))
  const centerX = anchor.x + anchor.w / 2, centerY = anchor.y + anchor.h / 2
  const right = anchor.x + anchor.w + gap, left = anchor.x - bubble.w - gap
  const above = anchor.y - bubble.h - gap, below = anchor.y + anchor.h + gap
  let side: 'left' | 'right' | 'top' | 'bottom'
  let x: number, y: number
  if (right + bubble.w <= viewport.w - margin || left >= margin) {
    const onRight = right + bubble.w <= viewport.w - margin
    side = onRight ? 'left' : 'right'
    x = onRight ? right : left
    y = clamp(centerY - bubble.h / 2, bubble.h, viewport.h)
  } else {
    const onTop = above >= margin || (below + bubble.h > viewport.h - margin && anchor.y > viewport.h - anchor.y - anchor.h)
    side = onTop ? 'bottom' : 'top'
    x = clamp(centerX - bubble.w / 2, bubble.w, viewport.w)
    y = clamp(onTop ? above : below, bubble.h, viewport.h)
  }
  const vertical = side === 'top' || side === 'bottom'
  const tail = Math.max(28, Math.min(vertical ? centerX - x : centerY - y, (vertical ? bubble.w : bubble.h) - 28))
  // If the viewer is too short to leave a gap, omit a misleading pointer.
  const detached = side === 'top' ? y < anchor.y + anchor.h : side === 'bottom' ? y + bubble.h > anchor.y : false
  return { x, y, side, tail, detached }
}
