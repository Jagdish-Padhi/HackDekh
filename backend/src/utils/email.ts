import nodemailer from 'nodemailer';

interface SendTeamInvitationEmailInput {
  to: string;
  invitationLink: string;
  teamName: string;
  ownerName: string;
  expiresAt: Date;
}

interface SendEmailVerificationInput {
  to: string;
  fullName: string;
  verificationLink: string;
}

const appName = process.env.APP_NAME || 'HackDekh';
const siteUrl = 'https://hackdekh.jdecodes.tech';

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

// Clean, professional email verification
export async function sendEmailVerificationEmail(input: SendEmailVerificationInput): Promise<void> {
  const subject = `Confirm your email address - ${appName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email - HackDekh</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; text-align: left;">
          
          <!-- Logo & Brand Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <span style="font-size: 20px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.02em; color: #111827;">Hack<span style="color: #2563eb;">Dekh</span></span>
              </a>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="font-size: 20px; font-weight: 600; color: #111827; padding-bottom: 16px; letter-spacing: -0.01em;">
              Confirm your email address
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #374151; padding-bottom: 24px;">
              Hi ${input.fullName},<br/><br/>
              Please confirm your email address to complete your registration and activate your HackDekh account.
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding-bottom: 28px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${input.verificationLink}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Confirm email address
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Note -->
          <tr>
            <td style="font-size: 13px; line-height: 1.5; color: #6b7280; padding-bottom: 24px;">
              This link will expire in 24 hours. If you didn&apos;t sign up for HackDekh, you can safely ignore this email.
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; line-height: 1.5;">
              HackDekh &bull; <a href="${siteUrl}" target="_blank" style="color: #9ca3af; text-decoration: none;">hackdekh.jdecodes.tech</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${input.fullName},

Please confirm your email address to activate your HackDekh account:
${input.verificationLink}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this message.

HackDekh - ${siteUrl}`;

  await sendMailWithFallback({
    to: input.to,
    subject,
    html,
    text,
  });
}

// Clean, professional team invitation email
export async function sendTeamInvitationEmail(input: SendTeamInvitationEmailInput): Promise<void> {
  const expiresOn = input.expiresAt.toLocaleString();
  const subject = `${input.ownerName} invited you to join ${input.teamName} on ${appName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - HackDekh</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; text-align: left;">
          
          <!-- Logo & Brand Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <span style="font-size: 20px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.02em; color: #111827;">Hack<span style="color: #2563eb;">Dekh</span></span>
              </a>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="font-size: 20px; font-weight: 600; color: #111827; padding-bottom: 16px; letter-spacing: -0.01em;">
              Join ${input.teamName} on HackDekh
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #374151; padding-bottom: 24px;">
              <strong>${input.ownerName}</strong> has invited you to join team <strong>${input.teamName}</strong>.
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding-bottom: 28px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${input.invitationLink}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View invitation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Note -->
          <tr>
            <td style="font-size: 13px; line-height: 1.5; color: #6b7280; padding-bottom: 24px;">
              This invitation link expires on ${expiresOn}.
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; line-height: 1.5;">
              HackDekh &bull; <a href="${siteUrl}" target="_blank" style="color: #9ca3af; text-decoration: none;">hackdekh.jdecodes.tech</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${input.ownerName} invited you to join ${input.teamName} on HackDekh.

View invitation:
${input.invitationLink}

This invitation expires on ${expiresOn}.

HackDekh - ${siteUrl}`;

  await sendMailWithFallback({
    to: input.to,
    subject,
    html,
    text,
  });
}
