import type { BondVectors, SVGPathAttributes } from './constants';
import { BondWidth, StereoBondWidth } from './constants';

class HashedBondPathRenderer {
  static preparePaths(bondVectors: BondVectors): SVGPathAttributes[] {
    const { startPosition, endPosition, firstHalfEdge } = bondVectors;
    const direction = endPosition.sub(startPosition);
    const length = direction.length();
    if (!length) return [];
    const unit = direction.normalized();
    const count = Math.max(3, Math.floor(length / (BondWidth * 3)));
    const step = length / (count - 1);
    const half = StereoBondWidth * 0.55;
    let d = '';
    for (let i = 0; i < count; i += 1) {
      const center = startPosition.addScaled(unit, step * i);
      const p = center.addScaled(firstHalfEdge.leftNormal, half);
      const q = center.addScaled(firstHalfEdge.leftNormal, -half);
      d += `M${p.x},${p.y} L${q.x},${q.y} `;
    }
    return [{ d, attrs: { 'stroke-width': `${BondWidth}` } }];
  }
}

export default HashedBondPathRenderer;
