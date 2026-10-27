import { identifyStructFormat } from '../identifyStructFormat';
import { SupportedFormat } from '../structFormatter.types';

describe('identifyStructFormat XML', () => {
  it.each([
    '<molecule id="m1"><atomArray/></molecule>',
    '<?xml version="1.0"?><cml><molecule id="m1"/></cml>',
    '<?xml version="1.0"?><cml:cml xmlns:cml="http://www.xml-cml.org/schema"><cml:molecule id="m1"/></cml:cml>',
  ])('identifies CML: %s', (source) => {
    expect(identifyStructFormat(source)).toBe(SupportedFormat.cml);
  });

  it('does not confuse a moleculeList prefix with a molecule element', () => {
    expect(identifyStructFormat('<moleculeList/>')).not.toBe(
      SupportedFormat.cml,
    );
  });

  it('identifies single-line CDXML before the SMILES fallback', () => {
    expect(identifyStructFormat('<?xml version="1.0"?><CDXML/>')).toBe(
      SupportedFormat.cdxml,
    );
  });

  it('keeps ordinary single-line SMILES detection', () => {
    expect(identifyStructFormat('CCO')).toBe(SupportedFormat.smiles);
  });
});
