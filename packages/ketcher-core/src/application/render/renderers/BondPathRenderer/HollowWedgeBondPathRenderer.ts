import type { BondVectors, SVGPathAttributes } from './constants';
import { StereoBondWidth } from './constants';

class HollowWedgeBondPathRenderer {
  static preparePaths(bondVectors: BondVectors): SVGPathAttributes[] {
    const { startPosition, endPosition, firstHalfEdge } = bondVectors;
    const b2 = endPosition.addScaled(firstHalfEdge.leftNormal, 0.7 * StereoBondWidth);
    const b3 = endPosition.addScaled(firstHalfEdge.leftNormal, -0.7 * StereoBondWidth);
    return [{
      d: `M${startPosition.x},${startPosition.y} L${b2.x},${b2.y} L${b3.x},${b3.y} Z`,
      attrs: { fill: '#fff', 'stroke-width': '2' },
    }];
  }
}

export default HollowWedgeBondPathRenderer;
