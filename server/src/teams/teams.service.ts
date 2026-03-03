import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        userId,
        name: dto.name,
        format: dto.format ?? 'OU',
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.team.findMany({
      where: { userId },
      select: { id: true, name: true, format: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, userId } });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(userId: string, id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({ where: { id, userId } });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.format !== undefined && { format: dto.format }),
        ...(dto.data !== undefined && { data: dto.data as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const team = await this.prisma.team.findFirst({ where: { id, userId } });
    if (!team) throw new NotFoundException('Team not found');
    await this.prisma.team.delete({ where: { id } });
  }
}
