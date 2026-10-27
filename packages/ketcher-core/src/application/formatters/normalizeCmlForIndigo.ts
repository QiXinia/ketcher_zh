const CML_NAMESPACE = 'http://www.xml-cml.org/schema';

/** Indigo's CML reader requires unprefixed CML element names. */
export function normalizeCmlForIndigo(source: string): string {
  // Do not hand entity declarations to a browser or a remote XML parser.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) {
    throw new Error('CML DTD and entity declarations are not supported');
  }
  if (!/<\/?[A-Za-z_][\w.-]*:/.test(source)) return source;
  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    throw new Error('This environment cannot parse namespaced CML');
  }
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('Invalid CML XML');
  }
  const elements = Array.from(document.getElementsByTagName('*'));
  for (const element of elements) {
    if (element.namespaceURI !== CML_NAMESPACE || !element.prefix) continue;
    const replacement = document.createElement(element.localName);
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.namespaceURI === CML_NAMESPACE && attribute.prefix) {
        if (element.hasAttribute(attribute.localName)) {
          throw new Error('Conflicting CML attribute names');
        }
        replacement.setAttribute(attribute.localName, attribute.value);
      } else {
        replacement.setAttributeNS(
          attribute.namespaceURI,
          attribute.name,
          attribute.value,
        );
      }
    }
    while (element.firstChild) replacement.appendChild(element.firstChild);
    element.parentNode?.replaceChild(replacement, element);
  }
  return new XMLSerializer().serializeToString(document);
}
