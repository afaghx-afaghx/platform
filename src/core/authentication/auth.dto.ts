import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(256) password!: string;
}

export class RefreshDto {
  @IsString() @MinLength(32) @MaxLength(512) refreshToken!: string;
}

export class MfaLoginDto {
  @IsString() @MinLength(16) @MaxLength(4096) challengeToken!: string;
  @Matches(/^\d{6}$/) code!: string;
}

export class RecoveryLoginDto {
  @IsString() @MinLength(16) @MaxLength(4096) challengeToken!: string;
  @Matches(/^[a-f0-9]{10}-[a-f0-9]{10}$/i) code!: string;
}

export class TotpEnrollDto {
  @IsOptional() @IsString() @MaxLength(100) label?: string;
}

export class TotpVerifyDto {
  @IsString() @Length(1, 64) factorId!: string;
  @Matches(/^\d{6}$/) code!: string;
}
