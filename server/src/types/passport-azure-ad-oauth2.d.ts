declare module 'passport-azure-ad-oauth2' {
  import { Strategy } from 'passport';

  interface AzureAdOAuth2StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
    resource?: string;
    useCommonEndpoint?: boolean;
  }

  type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: (error: any, user?: any) => void
  ) => void;

  class AzureAdOAuth2Strategy extends Strategy {
    constructor(options: AzureAdOAuth2StrategyOptions, verify: VerifyCallback);
  }

  export = AzureAdOAuth2Strategy;
}
