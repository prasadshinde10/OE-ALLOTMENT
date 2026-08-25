import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import AzureAdOAuth2Strategy from 'passport-azure-ad-oauth2';
import { env } from '../config/env';
import Student from '../models/Student';
import { logAudit } from '../services/auditService';

const isSSOConfigured =
  !!env.AZURE_CLIENT_ID &&
  !!env.AZURE_CLIENT_SECRET &&
  !!env.AZURE_TENANT_ID &&
  !!env.REDIRECT_URI;

if (isSSOConfigured) {
  passport.use(
    'azure-ad',
    new AzureAdOAuth2Strategy(
      {
        clientID: env.AZURE_CLIENT_ID,
        clientSecret: env.AZURE_CLIENT_SECRET,
        callbackURL: env.REDIRECT_URI,
        tenant: env.AZURE_TENANT_ID,
        resource: 'https://graph.microsoft.com',
      },
      (accessToken: string, refreshToken: string, params: any, profile: any, done: any) => {
        try {
          // Decode the id_token from Azure AD
          const idToken = params.id_token;
          const decoded: any = jwt.decode(idToken);

          if (!decoded) {
            return done(new Error('Failed to decode Microsoft ID token'), null);
          }

          const email = (decoded.upn || decoded.email || decoded.preferred_username || '').toLowerCase();
          const name = decoded.name || decoded.given_name || email.split('@')[0];

          if (!email) {
            return done(new Error('No email found in Microsoft account'), null);
          }

          // Strict domain check
          if (!email.endsWith('@mit.asia')) {
            return done(new Error('Only @mit.asia accounts are allowed to sign in'), null);
          }

          return done(null, { email, name });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Passport serialization (minimal — we use JWT, not sessions for app auth)
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  console.log('🔐 Microsoft Entra ID (Azure AD) SSO configured');
} else {
  console.log('⚠️ Microsoft SSO not configured (AZURE_CLIENT_ID/SECRET/TENANT_ID/REDIRECT_URI missing)');
}

/**
 * GET /api/auth/microsoft — Initiates Microsoft login redirect
 */
export const microsoftLogin = (req: Request, res: Response) => {
  if (!isSSOConfigured) {
    return res.status(503).json({ success: false, message: 'Microsoft SSO is not configured on this server.' });
  }

  passport.authenticate('azure-ad', {
    scope: ['openid', 'profile', 'email'],
  })(req, res);
};

/**
 * GET /api/auth/microsoft/callback — Handles callback from Azure AD
 */
export const microsoftCallback = (req: Request, res: Response) => {
  if (!isSSOConfigured) {
    return res.redirect(`${env.CLIENT_URL}/?error=sso_not_configured`);
  }

  passport.authenticate('azure-ad', { session: false }, async (err: any, azureUser: any) => {
    try {
      if (err || !azureUser) {
        const errorMsg = encodeURIComponent(err?.message || 'Microsoft login failed');
        return res.redirect(`${env.CLIENT_URL}/?error=${errorMsg}`);
      }

      const { email, name } = azureUser;

      // Find existing student by institute email
      let student = await Student.findOne({ instituteEmail: email });

      if (!student) {
        // Student not registered yet — redirect with helpful error
        const errorMsg = encodeURIComponent(
          'No account found for this email. Please register first, then use Microsoft SSO to log in.'
        );
        return res.redirect(`${env.CLIENT_URL}/?error=${errorMsg}`);
      }

      // Auto-verify on successful Microsoft login
      if (!student.isVerified) {
        student.isVerified = true;
        await student.save();
      }

      // Sign JWT token (same payload as normal student login)
      const token = jwt.sign(
        {
          userId: student._id,
          role: 'student',
          year: student.year,
          email: student.instituteEmail,
          name: student.fullName,
        },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      await logAudit({
        action: 'STUDENT_SSO_LOGIN',
        actorId: student.id,
        actorRole: 'student',
        targetType: 'student',
        targetId: student.id,
        metadata: { provider: 'microsoft' },
      });

      // Redirect to frontend auth-success page with token
      return res.redirect(`${env.CLIENT_URL}/auth-success?token=${token}`);
    } catch (error: any) {
      console.error('❌ Microsoft SSO callback error:', error);
      const errorMsg = encodeURIComponent('An error occurred during Microsoft login');
      return res.redirect(`${env.CLIENT_URL}/?error=${errorMsg}`);
    }
  })(req, res);
};
