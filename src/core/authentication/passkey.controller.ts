import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AfxPublic } from '../authorization/public.decorator';
import { SecurityContext } from './auth.service';
import { PasskeyService } from './passkey.service';

type ProtectedRequest = Request & { securityContext?: SecurityContext };

type PasskeyResponseBody = { challengeId: string; response: Parameters<typeof import('@simplewebauthn/server').verifyRegistrationResponse>[0]['response'] };

type AuthenticationBody = { challengeId: string; response: Parameters<typeof import('@simplewebauthn/server').verifyAuthenticationResponse>[0]['response'] };

@Controller('v1/auth/passkeys')
export class PasskeyController {
  constructor(private readonly passkeys: PasskeyService) {}

  @Post('registration/options')
  async registrationOptions(@Req() req: ProtectedRequest) {
    return this.passkeys.registrationOptions(this.context(req));
  }

  @Post('registration/verify')
  async registrationVerify(@Req() req: ProtectedRequest, @Body() body: PasskeyResponseBody) {
    return this.passkeys.verifyRegistration(this.context(req), body.challengeId, body.response);
  }

  @AfxPublic()
  @Post('authentication/options')
  async authenticationOptions() {
    return this.passkeys.authenticationOptions();
  }

  @AfxPublic()
  @Post('authentication/verify')
  async authenticationVerify(@Body() body: AuthenticationBody) {
    return this.passkeys.verifyAuthentication(body.challengeId, body.response);
  }

  private context(req: ProtectedRequest): SecurityContext {
    if (!req.securityContext) throw new UnauthorizedException('Security context required');
    return req.securityContext;
  }
}
