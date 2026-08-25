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

          const email = (decoded.preferred_username || decoded.upn || decoded.email || '').toLowerCase().trim();
          const fullName = (decoded.name || decoded.given_name || email.split('@')[0]).trim();

          if (!email) {
            return done(new Error('No email found in Microsoft account'), null);
          }

          // Strict domain check
          if (!email.endsWith('@mit.asia')) {
            return done(new Error('Only @mit.asia accounts are allowed to sign in'), null);
          }

          return done(null, { email, fullName });
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

const getClientBaseUrl = (): string => {
  const rawUrl = process.env.CLIENT_URL || env.CLIENT_URL || 'http://localhost:3000';
  // If comma-separated, take the first valid client URL
  const primaryUrl = rawUrl.split(',')[0].trim();
  // Strip all trailing slashes
  return primaryUrl.replace(/\/+$/, '');
};

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
  const clientBaseUrl = getClientBaseUrl();

  if (!isSSOConfigured) {
    const redirectUrl = `${clientBaseUrl}/?error=sso_not_configured`;
    console.log(`🔀 [MICROSOFT SSO REDIRECT] SSO not configured -> ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }

  passport.authenticate('azure-ad', { session: false }, async (err: any, azureUser: any) => {
    try {
      if (err || !azureUser) {
        const errorMsg = encodeURIComponent(err?.message || 'Microsoft login failed');
        const redirectUrl = `${clientBaseUrl}/?error=${errorMsg}`;
        console.log(`🔀 [MICROSOFT SSO REDIRECT] Auth failed -> ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }

      const { email, fullName } = azureUser;

      // Check if the student already exists in MongoDB
      let student = await Student.findOne({ instituteEmail: email.toLowerCase() });

      if (student) {
        // Auto-verify if not verified
        if (!student.isVerified) {
          student.isVerified = true;
          await student.save();
        }

        // Determine if existing user has completed their onboarding profile
        const isNewUser = student.isProfileComplete === false;

        const token = jwt.sign(
          {
            userId: student._id,
            role: 'student',
            year: student.year,
            email: student.instituteEmail,
            name: student.fullName || fullName,
            isProfileComplete: student.isProfileComplete,
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
          metadata: { provider: 'microsoft', isNewUser },
        });

        const redirectUrl = `${clientBaseUrl}/auth-success?token=${token}&isNewUser=${isNewUser}`;
        console.log(`🔀 [MICROSOFT SSO SUCCESS] Existing student -> ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }

      // NEW USER (First-time registration) -> Create pre-registration record
      const nameParts = (fullName || '').trim().split(/\s+/);
      let firstName = nameParts[0] || 'Student';
      let middleName = '';
      let lastName = '';

      if (nameParts.length === 2) {
        lastName = nameParts[1];
      } else if (nameParts.length >= 3) {
        middleName = nameParts.slice(1, -1).join(' ');
        lastName = nameParts[nameParts.length - 1];
      }

      student = new Student({
        firstName,
        middleName,
        lastName,
        instituteEmail: email.toLowerCase(),
        isVerified: true,
        isProfileComplete: false,
      });

      await student.save();
      console.log(`✨ [MICROSOFT SSO] Pre-registered new student: ${email} (${fullName})`);

      const token = jwt.sign(
        {
          userId: student._id,
          role: 'student',
          year: student.year,
          email: student.instituteEmail,
          name: student.fullName || fullName,
          isProfileComplete: false,
        },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      await logAudit({
        action: 'STUDENT_PRE_REGISTER',
        actorId: student.id,
        actorRole: 'student',
        targetType: 'student',
        targetId: student.id,
        metadata: { provider: 'microsoft', isNewUser: true },
      });

      const redirectUrl = `${clientBaseUrl}/auth-success?token=${token}&isNewUser=true`;
      console.log(`🔀 [MICROSOFT SSO SUCCESS] New student redirected to onboarding -> ${redirectUrl}`);
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('❌ Microsoft SSO callback error:', error);
      const errorMsg = encodeURIComponent('An error occurred during Microsoft login');
      const redirectUrl = `${clientBaseUrl}/?error=${errorMsg}`;
      console.log(`🔀 [MICROSOFT SSO REDIRECT] Error -> ${redirectUrl}`);
      return res.redirect(redirectUrl);
    }
  })(req, res);
};

