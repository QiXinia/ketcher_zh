import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';

export type ChemicalHotspot = { map: 'atoms' | 'bonds'; id: number };
export type HotspotDirection = 'left' | 'right' | 'up' | 'down';

export function validateChemicalHotspot(struct: Struct, target: unknown): ChemicalHotspot | null {
  if (!target || typeof target !== 'object') return null;
  const { map, id } = target as Partial<ChemicalHotspot>;
  if ((map !== 'atoms' && map !== 'bonds') || !Number.isInteger(id)) return null;
  if (!struct[map].has(id!)) return null;
  if (map === 'bonds') {
    const bond = struct.bonds.get(id!)!;
    if (!struct.atoms.has(bond.begin) || !struct.atoms.has(bond.end)) return null;
  }
  return { map, id: id! };
}

/** Read-only graph navigation: atom -> incident bond midpoint -> endpoint.
 * Choose the closest angular match in the requested half-plane; never jump
 * across an unconnected fragment, or wrap at a terminal atom. */
export function nextChemicalHotspot(
  struct: Struct,
  target: ChemicalHotspot | null,
  direction: HotspotDirection,
  isVisible: (target: ChemicalHotspot) => boolean = () => true,
): ChemicalHotspot | null {
  const axis = { left: new Vec2(-1, 0), right: new Vec2(1, 0), up: new Vec2(0, -1), down: new Vec2(0, 1) }[direction];
  if (!axis) throw new Error('不支持的热点导航方向');
  const current = validateChemicalHotspot(struct, target);
  if (!current || !isVisible(current)) {
    const first = [...struct.atoms.keys()].sort((a, b) => a - b)
      .find(id => isVisible({ map: 'atoms', id }));
    return first === undefined ? null : { map: 'atoms', id: first };
  }
  const position = (spot: ChemicalHotspot): Vec2 => {
    if (spot.map === 'atoms') return struct.atoms.get(spot.id)!.pp;
    const bond = struct.bonds.get(spot.id)!;
    return Vec2.sum(struct.atoms.get(bond.begin)!.pp, struct.atoms.get(bond.end)!.pp).scaled(0.5);
  };
  const candidates: ChemicalHotspot[] = [];
  if (current.map === 'atoms') {
    struct.bonds.forEach((bond, id) => {
      if (bond.begin === current.id || bond.end === current.id) candidates.push({ map: 'bonds', id });
    });
  } else {
    const bond = struct.bonds.get(current.id)!;
    candidates.push({ map: 'atoms', id: bond.begin }, { map: 'atoms', id: bond.end });
  }
  const origin = position(current);
  const ranked = candidates.filter(candidate => isVisible(candidate))
    .map(candidate => {
      const delta = Vec2.diff(position(candidate), origin);
      const distance = delta.length();
      const projection = Vec2.dot(delta, axis);
      return { candidate, distance, projection, cosine: distance > 1e-8 ? projection / distance : 0 };
    }).filter(candidate => candidate.projection > 1e-8)
    .sort((a, b) => b.cosine - a.cosine || a.distance - b.distance || a.candidate.id - b.candidate.id);
  return ranked[0]?.candidate ?? current;
}
