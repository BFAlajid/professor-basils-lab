import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
import { SafeUser } from '../../users/types/safe-user.type';

export type AuthenticatedUser = SafeUser & { sessionId: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
      issuer: 'professor-basil-lab',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return { ...user, sessionId: payload.sessionId };
  }
}
