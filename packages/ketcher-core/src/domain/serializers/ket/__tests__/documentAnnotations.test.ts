import { Struct } from 'domain/entities/struct';
import { KetSerializer } from '../ketSerializer';

describe('document annotations in KET', () => {
  it('round-trips document annotations through the header', () => {
    const serializer = new KetSerializer();
    const struct = new Struct();
    struct.name = 'annotated molecule';
    struct.annotations = [
      { keyword: 'Name', content: 'Example' },
      { keyword: 'Comment', content: 'Stored in KET header' },
    ];

    const ket = serializer.serializeMicromolecules(struct);
    expect(JSON.parse(ket).header.annotations).toEqual(struct.annotations);
    expect(serializer.deserializeMicromolecules(ket).annotations).toEqual(
      struct.annotations,
    );
  });

  it('omits an empty annotation list from the header', () => {
    const ket = new KetSerializer().serializeMicromolecules(new Struct());
    expect(JSON.parse(ket).header).toBeUndefined();
  });
});
