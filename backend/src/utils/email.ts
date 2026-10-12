import nodemailer from 'nodemailer';

interface SendTeamInvitationEmailInput {
  to: string;
  invitationLink: string;
  teamName: string;
  ownerName: string;
  expiresAt: Date;
}

const appName = process.env.APP_NAME || 'HackDekh';

function createTransporter(overridePort?: number, overrideSecure?: boolean) {
  const host = process.env.SMTP_HOST;
  const defaultPort = Number(process.env.SMTP_PORT || 587);
  const port = overridePort || defaultPort;
  const secure = overrideSecure !== undefined ? overrideSecure : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    auth: {
      user,
      pass,
    },
  });
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_FROM || process.env.SMTP_USER)
  );
}

async function sendMailWithFallback(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  const primaryTransporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!primaryTransporter || !from) {
    throw new Error(
      'Email delivery is not configured. Missing SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, or SMTP_FROM.'
    );
  }

  const enrichedOptions = {
    ...mailOptions,
    from: mailOptions.from || from,
  };

  try {
    await primaryTransporter.sendMail(enrichedOptions);
    console.log(`[Email] Delivered successfully to ${enrichedOptions.to}`);
  } catch (primaryError: any) {
    console.warn(`[Email] Primary delivery attempt failed (${primaryError.code || primaryError.message}), attempting fallback on port 465 (SSL)...`);
    try {
      const sslTransporter = createTransporter(465, true);
      if (sslTransporter) {
        await sslTransporter.sendMail(enrichedOptions);
        console.log(`[Email] Fallback delivery on port 465 succeeded to ${enrichedOptions.to}`);
        return;
      }
    } catch (sslError: any) {
      console.warn(`[Email] SSL fallback failed (${sslError.code || sslError.message}), attempting fallback on port 2525...`);
      const altTransporter = createTransporter(2525, false);
      if (altTransporter) {
        await altTransporter.sendMail(enrichedOptions);
        console.log(`[Email] Fallback delivery on port 2525 succeeded to ${enrichedOptions.to}`);
        return;
      }
    }
    throw primaryError;
  }
}

export async function sendTeamInvitationEmail(input: SendTeamInvitationEmailInput): Promise<void> {
  const expiresOn = input.expiresAt.toLocaleString();
  const subject = `${input.ownerName} invited you to join ${input.teamName} on ${appName}`;

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
    <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
      <h2 style="margin: 0 0 12px; font-size: 24px;">You are invited to join a team</h2>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
        <strong>${input.ownerName}</strong> invited you to join <strong>${input.teamName}</strong> on ${appName}.
      </p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563;">
        Click the button below to review and accept your invitation.
      </p>
      <a href="${input.invitationLink}" style="display: inline-block; padding: 12px 20px; border-radius: 9999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600;">
        Open Invitation
      </a>
      <p style="margin: 20px 0 8px; font-size: 12px; color: #6b7280;">
        This invitation link expires on ${expiresOn}.
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280; word-break: break-all;">
        If the button does not work, use this link: ${input.invitationLink}
      </p>
    </div>
  </div>`;

  const text = `${input.ownerName} invited you to join ${input.teamName} on ${appName}.\n\nOpen invitation: ${input.invitationLink}\n\nThis invitation expires on ${expiresOn}.`;

  await sendMailWithFallback({
    to: input.to,
    subject,
    html,
    text,
  });
}

interface SendEmailVerificationInput {
  to: string;
  fullName: string;
  verificationLink: string;
}

// Send branded email verification message via SMTP with automatic cloud fallback
export async function sendEmailVerificationEmail(input: SendEmailVerificationInput): Promise<void> {
  const subject = `Verify your email for ${appName}`;

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #18181b; padding: 20px;">
    <div style="padding: 32px; border: 1px solid #e4e4e7; border-radius: 20px; background: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 800; color: #2563eb;">${appName}</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #09090b;">Verify your email address</h2>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #52525b;">
        Hi <strong>${input.fullName}</strong>, thanks for joining ${appName}. Please confirm your email address to activate your account.
      </p>
      <div style="margin: 28px 0;">
        <a href="${input.verificationLink}" style="display: inline-block; padding: 12px 28px; border-radius: 10px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
          Confirm Email Address
        </a>
      </div>
      <p style="margin: 0 0 10px; font-size: 13px; color: #71717a;">
        This verification link will expire in 24 hours.
      </p>
      <p style="margin: 0; font-size: 12px; color: #a1a1aa; word-break: break-all;">
        If the button above does not work, visit: <a href="${input.verificationLink}" style="color: #2563eb;">${input.verificationLink}</a>
      </p>
    </div>
  </div>`;

  const text = `Hi ${input.fullName},\n\nPlease confirm your email address for ${appName} by visiting:\n${input.verificationLink}\n\nThis link will expire in 24 hours.`;

  await sendMailWithFallback({
    to: input.to,
    subject,
    html,
    text,
  });
}
