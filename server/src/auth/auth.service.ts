import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { HibpService } from './hibp.service';
import { CommonPasswordsService } from './common-passwords.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { SafeUser } from '../users/types/safe-user.type';
import { createHash, randomUUID } from 'crypto';
import { Request, Response } from 'express';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GENERIC_CREDENTIAL_ERROR = 'Invalid credentials';

export interface LoginResponse {
  accessToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly hibpService: HibpService,
    private readonly commonPasswordsService: CommonPasswordsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Pre-compute once — used when user not found to prevent timing-based enumeration
    this.dummyHash = await argon2.hash('timing-attack-prevention-dummy', ARGON2_OPTIONS);
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    this.commonPasswordsService.check(dto.password);
    await this.hibpService.checkPassword(dto.password);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      // Identical response as success — no email enumeration
      return { message: 'If this email is new, your account has been created.' };
    }

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    await this.prisma.user.create({ data: { email: dto.email, passwordHash } });

    return { message: 'If this email is new, your account has been created.' };
  }

  async login(dto: LoginDto, req: Request, res: Response): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always verify — dummy hash used when user not found to prevent timing attack
    const hashToVerify = user?.passwordHash ?? this.dummyHash;
    const isValid = await argon2.verify(hashToVerify, dto.password);

    if (!user || !isValid) {
      throw new UnauthorizedException(GENERIC_CREDENTIAL_ERROR);
    }

    const sessionId = randomUUID();
    const { accessToken, rawRefreshToken } = this.issueTokens(user.id, sessionId);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: this.hashToken(rawRefreshToken),
        ipAddress: this.extractIp(req),
        userAgent: req.headers['user-agent'] ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    this.setRefreshCookie(res, rawRefreshToken);

    const safeUser = await this.usersService.findById(user.id);
    return { accessToken, user: safeUser! };
  }

  async refresh(
    userId: string,
    sessionId: string,
    rawToken: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawToken);

    const session = await this.prisma.session.findUnique({ where: { tokenHash } });

    if (
      !session ||
      session.isRevoked ||
      session.expiresAt < new Date() ||
      session.userId !== userId ||
      session.id !== sessionId
    ) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const { accessToken, rawRefreshToken: newRawToken } = this.issueTokens(userId, session.id);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: this.hashToken(newRawToken),
        lastActive: new Date(),
      },
    });

    this.setRefreshCookie(res, newRawToken);
    return { accessToken };
  }

  async logout(userId: string, sessionId: string, res: Response): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });
    this.clearRefreshCookie(res);
  }

  async logoutAll(userId: string, res: Response): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    this.clearRefreshCookie(res);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    res: Response,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    this.commonPasswordsService.check(dto.newPassword);
    await this.hibpService.checkPassword(dto.newPassword);

    const newHash = await argon2.hash(dto.newPassword, ARGON2_OPTIONS);

    // Atomic: update password + revoke ALL sessions
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.clearRefreshCookie(res);
  }

  private issueTokens(
    userId: string,
    sessionId: string,
  ): { accessToken: string; rawRefreshToken: string } {
    const accessPayload: JwtPayload = { sub: userId, sessionId };
    const accessToken = this.jwtService.sign(accessPayload);

    const refreshPayload: JwtPayload = { sub: userId, sessionId };
    const rawRefreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '30d',
    });

    return { accessToken, rawRefreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: REFRESH_TTL_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }

  private extractIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    return req.socket?.remoteAddress ?? null;
  }
}
