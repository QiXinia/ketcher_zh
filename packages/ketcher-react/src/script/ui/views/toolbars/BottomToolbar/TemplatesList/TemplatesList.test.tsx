import { fireEvent, render, screen } from '@testing-library/react';
import {
  MolSerializer,
  Bond,
  ReStruct,
  Struct,
  Vec2,
  fromTemplateOnCanvas,
} from 'ketcher-core';
import templates from '../../../../data/templates';
import { TemplatesList } from './TemplatesList';

it('offers both chair templates as direct, editable ring tools', () => {
  const onAction = jest.fn();
  render(
    <TemplatesList
      disableableButtons={[]}
      indigoVerification={false}
      status={{} as never}
      onAction={onAction}
    />,
  );

  for (const index of [8, 9]) {
    fireEvent.click(screen.getByTestId(`template-${index}`));
    expect(onAction).toHaveBeenLastCalledWith({
      tool: 'template',
      opts: { struct: templates[index], ringTool: true },
    });
    const chair = templates[index];
    expect(chair.name).toBe(index === 8 ? 'Chair1' : 'Chair2');
    expect(chair.atoms.size).toBe(6);
    expect(chair.bonds.size).toBe(6);
    expect(
      [...chair.bonds.values()].every(
        (bond) => bond.type === Bond.PATTERN.TYPE.SINGLE,
      ),
    ).toBe(true);
    const roundTrip = new MolSerializer().deserialize(
      new MolSerializer().serialize(chair),
    );
    expect(roundTrip.atoms.size).toBe(6);
    expect(roundTrip.bonds.size).toBe(6);
  }
  const first = [...templates[8].atoms.values()];
  const second = [...templates[9].atoms.values()];
  const midpointSum = first[0].pp.x + second[0].pp.x;
  first.forEach((atom, index) => {
    expect(atom.pp.x + second[index].pp.x).toBeCloseTo(midpointSum, 3);
    expect(atom.pp.y).toBeCloseTo(second[index].pp.y, 3);
  });
});

it.each([8, 9])('places chair %i as an undoable six-membered ring', (index) => {
  const struct = new Struct();
  const layer = {
    attr() {
      return this;
    },
    toFront() {
      return this;
    },
  };
  const render = {
    paper: { rect: () => layer },
    options: { microModeScale: 1, zoom: 1 },
    viewBox: { minX: 0, minY: 0 },
  };
  const restruct = new ReStruct(struct, render as never);
  const [undo, placed] = fromTemplateOnCanvas(
    restruct,
    { molecule: templates[index], aid: 0, bid: 0, angle0: 0 },
    new Vec2(0, 0),
    0,
    false,
  );
  expect(placed.atoms).toHaveLength(6);
  expect(placed.bonds).toHaveLength(6);
  expect(struct.atoms.size).toBe(6);
  expect(struct.bonds.size).toBe(6);
  const redo = undo.perform(restruct);
  expect(struct.atoms.size).toBe(0);
  expect(struct.bonds.size).toBe(0);
  redo.perform(restruct);
  expect(struct.atoms.size).toBe(6);
  expect(struct.bonds.size).toBe(6);
});
