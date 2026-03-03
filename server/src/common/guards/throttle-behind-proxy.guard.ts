import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class ThrottleBehindProxyGuard extends ThrottlerGuard {
  // Reads the real IP from X-Forwarded-For when behind Railway/Vercel/Nginx proxy
  protected async getTracker(req: Request): Promise<string> {
    const forwarded = req.ips;
    return forwarded.length > 0 ? (forwarded[0] ?? req.ip ?? 'unknown') : (req.ip ?? 'unknown');
  }
}
