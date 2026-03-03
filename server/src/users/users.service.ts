import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.type';

const SAFE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  mfaEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { email }, select: SAFE_SELECT });
  }

  async updateDisplayName(id: string, displayName: string): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: { displayName },
      select: SAFE_SELECT,
    });
  }

  async getActiveSessions(
    userId: string,
  ): Promise<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastActive: Date;
    }>
  > {
    return this.prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActive: true,
      },
      orderBy: { lastActive: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });
  }
}
