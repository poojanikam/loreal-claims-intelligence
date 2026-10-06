import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClaimsModule } from './claims/claims.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ClaimsModule,
  ],
})
export class AppModule {}
