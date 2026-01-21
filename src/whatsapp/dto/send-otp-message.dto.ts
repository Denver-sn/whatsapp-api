import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendOtpMessageDto {
  @ApiProperty({
    description: "Phone number to send OTP to (with country code)",
    example: "221777460452",
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: "OTP code to send",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  otp!: string;
}
