import { Shield, Bell, UserCog } from 'lucide-react';

const SettingsPage = () => {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Account and team preferences are being rolled out. Basic profile actions are available from the navbar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/85">
          <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Profile</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Update profile details and account identity.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/85">
          <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Control invite, team, and hackathon alerts.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/85">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Security</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Password and session controls are coming next.</p>
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;
