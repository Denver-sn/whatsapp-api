import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsPort, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  WHATSAPP_ACCESS_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  WHATSAPP_PHONE_NUMBER_ID: string;

  @IsString()
  @IsNotEmpty()
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: string;

  @IsString()
  @IsOptional()
  WHATSAPP_API_VERSION: string = 'v18.0';

  @IsPort()
  @IsOptional()
  PORT: string = '3000';

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}