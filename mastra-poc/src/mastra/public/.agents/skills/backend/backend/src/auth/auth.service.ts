import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import { UserService } from '../user/user.service';

interface EntraTokenPayload {
  oid: string;
  preferred_username?: string;
  email?: string;
  name?: string;
}

interface ValidateResult {
  valid: boolean;
  user?: {
    id: string;
    entraId: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
}

@Injectable()
export class AuthService {
  private readonly jwksClient: JwksClient;
  private readonly tenantId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.tenantId = this.configService.get<string>('ENTRA_TENANT_ID') || '';
    this.jwksClient = new JwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 3600000,
    });
  }

  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err);
        }
        resolve(key?.getPublicKey() || '');
      });
    });
  }

  async verifyToken(token: string): Promise<EntraTokenPayload> {
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = (decodedHeader as any)?.header?.kid;

    if (!kid) {
      throw new Error('Token does not contain kid in header');
    }

    const publicKey = await this.getSigningKey(kid);

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        publicKey,
        {
          algorithms: ['RS256'],
          issuer: `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
        },
        (err, decoded) => {
          if (err) {
            return reject(err);
          }
          resolve(decoded as EntraTokenPayload);
        },
      );
    });
  }

  async validateOrCreateUser(token: string): Promise<ValidateResult> {
    try {
      const payload = await this.verifyToken(token);

      const entraId = payload.oid;
      const email = payload.preferred_username || payload.email || '';
      const name = payload.name || 'Usuario';

      const user = await this.userService.findOrCreate(entraId, email, name);

      return {
        valid: true,
        user: {
          id: user.id,
          entraId: user.entraId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch {
      return { valid: false, error: 'Invalid or expired token' };
    }
  }
}
