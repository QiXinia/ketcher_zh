import { Atom, ChemicalMimeType, Struct, Vec2 } from 'ketcher-core';
import copyAs from './copyAs';

describe('copy as a chemical format', () => {
  const writeText = jest.fn();
  const errorHandler = jest.fn();
  const convert = jest.fn();
  const molecule = () => {
    const struct = new Struct();
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
    return struct;
  };
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    errorHandler.mockReset();
    convert.mockReset().mockResolvedValue({ struct: 'C' });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    global.currentState = {
      editor: { structSelected: molecule, errorHandler },
      server: { convert },
      options: { getServerSettings: () => ({}) },
    } as any;
  });

  it('converts the selected molecule and copies the requested SMILES', async () => {
    await copyAs('smiles');
    expect(convert).toHaveBeenCalledWith(
      expect.objectContaining({ output_format: ChemicalMimeType.DaylightSmiles }),
      expect.any(Object),
    );
    expect(writeText).toHaveBeenCalledWith('C');
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it.each([
    ['inchi', ChemicalMimeType.InChI],
    ['inchikey', ChemicalMimeType.InChIKey],
    ['cdxml', ChemicalMimeType.CDXML],
  ])('requests the correct format for %s', async (format, mime) => {
    await copyAs(format);
    expect(convert).toHaveBeenCalledWith(expect.objectContaining({ output_format: mime }), expect.any(Object));
    expect(writeText).toHaveBeenCalledWith('C');
  });

  it('does not send a selection containing graphics to the converter', async () => {
    const struct = molecule();
    (struct as any).texts = { size: 1 };
    global.currentState.editor.structSelected = () => struct;
    await copyAs('inchi');
    expect(convert).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
  });

  it('does not convert a disconnected selection', async () => {
    const struct = molecule();
    struct.atoms.add(new Atom({ label: 'O', pp: new Vec2(2, 0) }));
    global.currentState.editor.structSelected = () => struct;
    await copyAs('smiles');
    expect(convert).not.toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
  });

  it('reports a rejected clipboard write', async () => {
    writeText.mockRejectedValue(new Error('clipboard denied'));
    await copyAs('ket');
    expect(errorHandler).toHaveBeenCalledWith('clipboard denied');
  });
});
