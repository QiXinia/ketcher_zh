import { ServerFormatter } from '../serverFormatter';
import { SupportedFormat } from '../structFormatter.types';
import type { StructService } from 'domain/services';
import type { KetSerializer } from 'domain/serializers/ket/ketSerializer';

describe('ServerFormatter', () => {
  it('normalizes prefixed CML and retains the converter receiver', async () => {
    const result = { marker: 'parsed' };
    const service = {
      marker: 'service',
      async convert(data: { struct: string; output_format: string }) {
        expect(this.marker).toBe('service');
        if (data.output_format === 'chemical/x-indigo-ket') {
          expect(data.struct).toContain('<molecule');
          expect(data.struct).not.toContain('<c:molecule');
          return { struct: 'ket' };
        }
        return { struct: 'CCO' };
      },
    };
    const serializer = { deserialize: jest.fn(() => result) };
    const formatter = new ServerFormatter(
      service as unknown as StructService,
      serializer as unknown as KetSerializer,
      SupportedFormat.cml,
    );
    expect(
      await formatter.getStructureFromStringAsync(
        '<c:cml xmlns:c="http://www.xml-cml.org/schema"><c:molecule/></c:cml>',
      ),
    ).toBe(result);
    expect(serializer.deserialize).toHaveBeenCalledWith('ket');
  });

  it('rejects CML if the KET conversion changes stereochemistry', async () => {
    const service = {
      async convert(data: { input_format?: string; output_format: string }) {
        if (data.output_format === 'chemical/x-indigo-ket')
          return { struct: 'ket' };
        return {
          struct:
            data.input_format === 'chemical/x-cml'
              ? 'F[C@](Cl)(Br)I'
              : 'FC(Cl)(Br)I',
        };
      },
    };
    const serializer = { deserialize: jest.fn() };
    const formatter = new ServerFormatter(
      service as unknown as StructService,
      serializer as unknown as KetSerializer,
      SupportedFormat.cml,
    );
    await expect(
      formatter.getStructureFromStringAsync('<cml><molecule/></cml>'),
    ).rejects.toThrow('stereochemical structure');
    expect(serializer.deserialize).not.toHaveBeenCalled();
  });

  it('retains the layout receiver for coordinate-free formats', async () => {
    const result = { rescale: jest.fn() };
    const service = {
      marker: 'service',
      async layout() {
        expect(this.marker).toBe('service');
        return { struct: 'ket' };
      },
    };
    const serializer = { deserialize: () => result };
    const formatter = new ServerFormatter(
      service as unknown as StructService,
      serializer as unknown as KetSerializer,
      SupportedFormat.inChI,
    );
    expect(
      await formatter.getStructureFromStringAsync('InChI=1S/H2O/h1H2'),
    ).toBe(result);
    expect(result.rescale).toHaveBeenCalledTimes(1);
  });
});
