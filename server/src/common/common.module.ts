import { Module } from '@nestjs/common';
import { ThrottleBehindProxyGuard } from './guards/throttle-behind-proxy.guard';

@Module({
  providers: [ThrottleBehindProxyGuard],
  exports: [ThrottleBehindProxyGuard],
})
export class CommonModule {}
