import { normalizeCmlForIndigo } from '../normalizeCmlForIndigo';

describe('normalizeCmlForIndigo', () => {
  it('removes only the official CML element prefixes and retains foreign namespaces', () => {
    const source =
      '<?xml version="1.0"?><c:cml xmlns:c="http://www.xml-cml.org/schema" xmlns:x="urn:other"><c:molecule c:id="m1"><c:atomArray/><x:extension x:value="ok"/></c:molecule></c:cml>';
    const normalized = normalizeCmlForIndigo(source);
    const doc = new DOMParser().parseFromString(normalized, 'application/xml');
    expect(doc.getElementsByTagName('molecule')).toHaveLength(1);
    expect(doc.getElementsByTagName('molecule')[0].getAttribute('id')).toBe(
      'm1',
    );
    expect(doc.getElementsByTagNameNS('urn:other', 'extension')).toHaveLength(
      1,
    );
  });

  it('leaves unprefixed and default-namespace CML intact', () => {
    const source =
      '<cml xmlns="http://www.xml-cml.org/schema"><molecule/></cml>';
    expect(normalizeCmlForIndigo(source)).toBe(source);
  });

  it('rejects malformed XML, entity declarations and conflicting attribute names', () => {
    expect(() => normalizeCmlForIndigo('<c:molecule>')).toThrow('Invalid CML');
    expect(() => normalizeCmlForIndigo('<!DOCTYPE cml><cml/>')).toThrow('DTD');
    expect(() =>
      normalizeCmlForIndigo(
        '<c:molecule xmlns:c="http://www.xml-cml.org/schema" id="a" c:id="b"/>',
      ),
    ).toThrow('Conflicting');
  });
});
