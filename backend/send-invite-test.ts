import { sendTeamInvitationEmail } from './src/utils/email.ts';

async function sendTestEmail() {
  try {
    await sendTeamInvitationEmail({
      to: 'code369decode@gmail.com',
      invitationLink: 'http://localhost:5173/accept-invitation?token=keepalive-test',
      teamName: 'HackDekh Team',
      ownerName: 'Jagdish',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    console.log('Invitation email sent successfully to code369decode@gmail.com');
  } catch (error) {
    console.error('Error sending invitation email:', error);
    process.exit(1);
  }
}

sendTestEmail();
