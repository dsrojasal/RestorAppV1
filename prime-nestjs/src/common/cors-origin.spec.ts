import { crearValidadorOrigenes, ValidadorOrigen } from './cors-origin';

function permitido(validador: ValidadorOrigen, origin?: string): Promise<boolean> {
  return new Promise((resolve) => {
    validador(origin, (_error, allow) => resolve(!!allow));
  });
}

describe('crearValidadorOrigenes', () => {
  const validador = crearValidadorOrigenes(['http://localhost:3001', 'https://restorapp.local']);

  it('permite peticiones sin cabecera Origin', async () => {
    await expect(permitido(validador, undefined)).resolves.toBe(true);
  });

  it('permite un origen listado exactamente', async () => {
    await expect(permitido(validador, 'http://localhost:3001')).resolves.toBe(true);
    await expect(permitido(validador, 'https://restorapp.local')).resolves.toBe(true);
  });

  it('permite localhost en cualquier puerto', async () => {
    await expect(permitido(validador, 'http://localhost:4321')).resolves.toBe(true);
    await expect(permitido(validador, 'http://127.0.0.1:3001')).resolves.toBe(true);
  });

  it('permite IPs de la red privada en cualquier puerto', async () => {
    await expect(permitido(validador, 'http://192.168.1.47:3001')).resolves.toBe(true);
    await expect(permitido(validador, 'http://10.0.0.8:9999')).resolves.toBe(true);
    await expect(permitido(validador, 'http://172.16.5.4:3001')).resolves.toBe(true);
    await expect(permitido(validador, 'http://172.31.255.1:3001')).resolves.toBe(true);
  });

  it('rechaza orígenes públicos de internet', async () => {
    await expect(permitido(validador, 'http://evil.example.com')).resolves.toBe(false);
    await expect(permitido(validador, 'https://8.8.8.8')).resolves.toBe(false);
    await expect(permitido(validador, 'http://172.32.0.1:3001')).resolves.toBe(false);
  });

  it('rechaza orígenes malformados o con protocolos no HTTP', async () => {
    await expect(permitido(validador, 'no-es-una-url')).resolves.toBe(false);
    await expect(permitido(validador, 'file:///etc/passwd')).resolves.toBe(false);
  });
});
