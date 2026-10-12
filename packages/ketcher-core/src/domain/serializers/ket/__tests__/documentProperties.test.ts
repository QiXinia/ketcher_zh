import { Struct } from 'domain/entities/struct';
import { KetSerializer } from '../ketSerializer';

describe('document properties in KET', () => {
  it('round-trips document properties through the header', () => {
    const serializer = new KetSerializer();
    const struct = new Struct();
    struct.properties = [
      { name: 'Author', value: 'ChemWiki', type: 'string', rule: '', status: 'ok' },
      { name: 'Revision', value: '2', type: 'integer', rule: '>=1', status: 'valid' },
    ];

    const ket = serializer.serializeMicromolecules(struct);
    expect(JSON.parse(ket).header.properties).toEqual(struct.properties);
    expect(serializer.deserializeMicromolecules(ket).properties).toEqual(struct.properties);
  });

  it('omits an empty property list from the header', () => {
    const ket = new KetSerializer().serializeMicromolecules(new Struct());
    expect(JSON.parse(ket).header).toBeUndefined();
  });
});
