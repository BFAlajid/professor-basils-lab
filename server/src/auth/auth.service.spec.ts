import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { HibpService } from './hibp.service';
import { CommonPasswordsService } from './common-passwords.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(() => 'mock.jwt.token'),
  verify: jest.fn(),
};

const mockUsersService = {
  findById: jest.fn(),
};

const mockHibp = {
  checkPassword: jest.fn().mockResolvedValue(undefined),
};

const mockCommonPasswords = {
  check: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: UsersService, useValue: mockUsersService },
        { provide: HibpService, useValue: mockHibp },
        { provide: CommonPasswordsService, useValue: mockCommonPasswords },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Initialize the dummy hash as onModuleInit would
    await service.onModuleInit();

    jest.clearAllMocks();
    mockHibp.checkPassword.mockResolvedValue(undefined);
  });

  describe('register()', () => {
    const dto: RegisterDto = { email: 'test@test.com', password: 'ValidPass1!LongEnough' };

    it('returns generic success message for new email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '1', email: dto.email });

      const result = await service.register(dto);

      expect(result.message).toContain('account has been created');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('returns same generic message for duplicate email — no 409', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const result = await service.register(dto);

      expect(result.message).toContain('account has been created');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when HIBP reports breach', async () => {
      mockHibp.checkPassword.mockRejectedValue(
        new BadRequestException('Password in breach'),
      );

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('calls commonPasswords.check before HIBP check', async () => {
      const order: string[] = [];
      mockCommonPasswords.check.mockImplementation(() => order.push('common'));
      mockHibp.checkPassword.mockImplementation(async () => order.push('hibp'));
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '1', email: dto.email });

      await service.register(dto);

      expect(order).toEqual(['common', 'hibp']);
    });
  });

  describe('login()', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as never;
    const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as never;

    it('throws UnauthorizedException for wrong password (same as nonexistent user)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@x.com', password: 'anything' }, mockReq, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('never exposes which condition caused the 401 (user not found vs wrong password)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      let noUserError: string | undefined;
      try {
        await service.login({ email: 'ghost@x.com', password: 'WrongPass1!' }, mockReq, mockRes);
      } catch (e) {
        noUserError = (e as UnauthorizedException).message;
      }

      // Wrong password (user exists but hash won't match)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$totally-invalid',
      });

      let wrongPassError: string | undefined;
      try {
        await service.login(
          { email: 'test@test.com', password: 'wrong' },
          mockReq,
          mockRes,
        );
      } catch (e) {
        wrongPassError = (e as UnauthorizedException).message;
      }

      expect(noUserError).toBe(wrongPassError);
    });
  });
});
