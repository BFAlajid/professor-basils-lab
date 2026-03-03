import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CommonPasswordsService implements OnModuleInit {
  private readonly logger = new Logger(CommonPasswordsService.name);
  private readonly blocklist = new Set<string>();

  onModuleInit(): void {
    // __dirname resolves to src/auth/ in dev (ts-node) and dist/auth/ in prod
    const filePath = join(__dirname, 'data', 'common-passwords.txt');
    try {
      const content = readFileSync(filePath, 'utf8');
      let count = 0;
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) {
          this.blocklist.add(trimmed.toLowerCase());
          count++;
        }
      }
      this.logger.log(`Loaded ${count} common passwords into blocklist`);
    } catch {
      this.logger.warn('common-passwords.txt not found — common password check disabled');
    }
  }

  check(password: string): void {
    if (this.blocklist.size === 0) return; // file not loaded, skip
    if (this.blocklist.has(password.toLowerCase())) {
      throw new BadRequestException(
        'This password is too common. Please choose a more unique password.',
      );
    }
  }
}
