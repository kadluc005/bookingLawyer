import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationModule } from '@nestjs/authorization';
import { AuthenticationModule } from '@nestjs/authentication';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ControllersModule } from './controllers/controllers.module.js';
import { DatabaseModule } from './database/database.module.js';
import { BookingMailModule } from './mail/booking-mail.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthenticationModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const key = configService.getOrThrow<string>('JWT_SECRET');
        if (Buffer.byteLength(key) < 32) {
          throw new Error('JWT_SECRET must be at least 32 bytes long.');
        }

        return {
          accessToken: {
            key,
            issuer: 'bookinglawyer-api',
            audience: 'bookinglawyer-clients',
            ttl: '15m',
          },
          refreshToken: false,
        };
      },
    }),
    AuthorizationModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    ControllersModule,
    BookingMailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
