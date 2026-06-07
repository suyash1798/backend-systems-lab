import { createHmac, timingSafeEqual } from 'crypto';

interface JwtPayload {
  sub?: string;
  exp?: number;
}

class JwtTokenVerifier {
  constructor(private readonly secret: string) {}

  playerId(token: string): string {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error('invalid token');
    }

    const header = this.decode(encodedHeader) as { alg?: string };

    if (header.alg !== 'HS256') {
      throw new Error('invalid token');
    }

    this.verifySignature(`${encodedHeader}.${encodedPayload}`, signature);
    const payload = this.decode(encodedPayload) as JwtPayload;

    if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now()) {
      throw new Error('invalid token');
    }

    return payload.sub;
  }

  private verifySignature(data: string, signature: string): void {
    const expected = this.base64Url(createHmac('sha256', this.secret).update(data).digest());
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new Error('invalid token');
    }
  }

  private decode(value: string): object {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  }

  private base64Url(value: Buffer): string {
    return value
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

export default JwtTokenVerifier;
