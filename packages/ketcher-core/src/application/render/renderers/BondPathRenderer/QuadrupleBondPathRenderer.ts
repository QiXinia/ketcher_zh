import {
  type SVGPathAttributes,
  type BondVectors,
  BondWidth,
  BondSpace,
} from 'application/render/renderers/BondPathRenderer/constants';

class QuadrupleBondPathRenderer {
  static preparePaths(bondVectors: BondVectors): SVGPathAttributes[] {
    const { startPosition, endPosition, firstHalfEdge } = bondVectors;
    const offsets = [-1.5, -0.5, 0.5, 1.5];
    const path = offsets
      .map((offset) => {
        const start = startPosition.addScaled(
          firstHalfEdge.leftNormal,
          BondSpace * offset,
        );
        const end = endPosition.addScaled(
          firstHalfEdge.leftNormal,
          BondSpace * offset,
        );
        return `M${start.x},${start.y} L${end.x},${end.y}`;
      })
      .join(' ');

    return [{
      d: path,
      attrs: { 'stroke-width': `${BondWidth}` },
    }];
  }
}

export default QuadrupleBondPathRenderer;
