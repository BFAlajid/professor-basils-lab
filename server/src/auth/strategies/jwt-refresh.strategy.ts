import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface RefreshTokenUser {
  userId: string;
  sessionId: string;
  rawToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      // Extract refresh token from HttpOnly cookie, not Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          return (req?.cookies as Record<string, string> | undefined)?.['refresh_token'] ?? null;
        },
      ]),
      secretOrKey: (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
      issuer: 'professor-basil-lab',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string; sessionId: string }): RefreshTokenUser {
    const rawToken = (req.cookies as Record<string, string>)['refresh_token'] ?? '';
    return { userId: payload.sub, sessionId: payload.sessionId, rawToken };
  }
}
