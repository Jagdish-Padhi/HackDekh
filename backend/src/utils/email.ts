import nodemailer from 'nodemailer';

interface SendTeamInvitationEmailInput {
  to: string;
  invitationLink: string;
  teamName: string;
  ownerName: string;
  expiresAt: Date;
}

const appName = process.env.APP_NAME || 'HackDekh';

function getTransportConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(getTransportConfig() && (process.env.SMTP_FROM || process.env.SMTP_USER));
}

export async function sendTeamInvitationEmail(input: SendTeamInvitationEmailInput): Promise<void> {
  const transportConfig = getTransportConfig();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transportConfig || !from) {
    throw new Error('Email delivery is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const transporter = nodemailer.createTransport(transportConfig);
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

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
    text,
  });
}
