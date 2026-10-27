import {
  type SVGPathAttributes,
  type BondVectors,
  BondDashArrayMap,
  BondWidth,
} from 'application/render/renderers/BondPathRenderer/constants';
import { BondType, type BondDisplay } from 'domain/entities/CoreBond';

class SingleBondPathRenderer {
  static preparePaths(
    bondVectors: BondVectors,
    type?: BondType,
    display: BondDisplay = 'plain',
  ): SVGPathAttributes[] {
    const { startPosition, endPosition } = bondVectors;

    const strokeDasharray =
      type !== undefined ? BondDashArrayMap[type] : 'none';
    const svgPath: SVGPathAttributes = {
      d: `
          M${startPosition.x},${startPosition.y}
          L${endPosition.x},${endPosition.y}
        `,
      attrs: {
        'marker-end': type === BondType.Dative ? 'url(#arrow-marker)' : 'none',
        'stroke-dasharray': display === 'dotted' ? '1 5' : display === 'dashed' ? '6 4' : strokeDasharray,
        'stroke-linecap': display === 'dotted' ? 'round' : 'butt',
        'stroke-width': `${display === 'bold' ? BondWidth * 2 : BondWidth}`,
      },
    };

    return [svgPath];
  }
}

export default SingleBondPathRenderer;
