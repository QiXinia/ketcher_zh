import { Struct } from 'domain/entities/struct';
import { textToStruct } from 'domain/serializers/ket/fromKet/textToStruct';
import { textToKet } from 'domain/serializers/ket/toKet/textToKet';

describe('KET text formatting round trip', () => {
  it('preserves text styles, paragraph alignment and line spacing', () => {
    const struct = new Struct();
    const ketText = {
      type: 'text',
      boundingBox: { x: 1, y: 2, width: 4, height: 1 },
      paragraphs: [{
        alignment: 'center',
        lineSpacing: 1.5,
        parts: [{
          text: 'H2O+',
          underline: true,
          font: { family: 'Arial', size: 18 },
        }],
      }],
    };

    textToStruct(ketText, struct);
    const text = struct.texts.get(0)!;
    const roundTripped = textToKet({
      selected: false,
      data: {
        content: text.content,
        pos: text.pos.map((point) => ({ x: point.x, y: point.y })),
      },
    });

    expect(roundTripped.paragraphs[0]).toMatchObject({
      alignment: 'center',
      lineSpacing: 1.5,
      parts: [{
        text: 'H2O+',
        underline: true,
        font: { family: 'Arial', size: 18 },
      }],
    });
  });
});
