import { DocumentPropertiesSet } from '../DocumentPropertiesSet';

describe('DocumentPropertiesSet', () => {
  it('sets and inverts document properties', () => {
    const molecule = {
      properties: [{ name: 'Author', value: 'Before', type: 'string', rule: '', status: 'ok' }],
    };
    const restruct = { molecule } as any;
    const operation = new DocumentPropertiesSet([
      { name: 'Author', value: 'After', type: 'string', rule: '', status: 'ok' },
    ]);

    operation.execute(restruct);
    expect(molecule.properties).toEqual([
      { name: 'Author', value: 'After', type: 'string', rule: '', status: 'ok' },
    ]);
    const inverse = operation.invert();
    inverse.execute(restruct);
    expect(molecule.properties).toEqual([
      { name: 'Author', value: 'Before', type: 'string', rule: '', status: 'ok' },
    ]);
  });
});
