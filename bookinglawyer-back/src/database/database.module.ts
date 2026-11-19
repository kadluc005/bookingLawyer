import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connection = configService.get<string>('DATABASE_URL');

        if (!connection) {
          throw new Error('DATABASE_URL must be set to connect to PostgreSQL.');
        }

        return { drizzle, connection };
      },
    }),
  ],
})
export class DatabaseModule {}
