import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class HibpService {
  private readonly logger = new Logger(HibpService.name);

  async checkPassword(plaintext: string): Promise<void> {
    const sha1 = createHash('sha1').update(plaintext).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true',
          'User-Agent': 'professor-basil-lab/1.0',
        },
      });

      if (!res.ok) {
        // HIBP unavailable — fail open to preserve availability
        this.logger.warn(`HIBP API returned ${res.status}, skipping breach check`);
        return;
      }

      const body = await res.text();
      for (const line of body.split('\r\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const hashSuffix = line.slice(0, colonIdx);
        const count = parseInt(line.slice(colonIdx + 1), 10);
        if (hashSuffix === suffix && count > 0) {
          throw new BadRequestException(
            'This password has appeared in a data breach. Please choose a different password.',
          );
        }
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // Network error — fail open
      this.logger.warn('HIBP check failed due to network error, skipping');
    }
  }
}
