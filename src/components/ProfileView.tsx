import { Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Conversation, UserProfile } from '../types/nexora';

interface ProfileViewProps {
  profile: UserProfile;
  conversations: Conversation[];
  onSaveProfile: (updated: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  conversations,
  onSaveProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setRole(profile.role);
    setEmail(profile.email);
    setBio(profile.bio);
  }, [profile]);

  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
  const totalFiles = conversations.reduce(
    (sum, c) =>
      sum +
      c.messages.reduce(
        (mSum, m) => mSum + (m.attachments ? m.attachments.length : 0),
        0,
      ),
    0,
  );

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      name: name.trim() || profile.name,
      role: role.trim() || profile.role,
      email: email.trim() || profile.email,
      bio: bio.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-slate-200 dark:border-white/[0.08] pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            User Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">
            Manage your personal workspace identity and assistant context.
          </p>
        </div>

        {/* Profile Identity Row */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-white/[0.12] bg-violet-600/15 flex items-center justify-center shrink-0">
            {profile.avatarUrl && !avatarFailed ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-violet-600 dark:text-violet-300">
                {initials || 'NA'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {profile.name}
            </div>
            <div className="text-sm text-slate-500 dark:text-[#94A3B8] truncate">
              {profile.role} · {profile.email}
            </div>
          </div>
        </div>

        {/* Real Workspace Activity Summary */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/[0.08] rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#101321]">
          <div className="p-4">
            <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Conversations</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {conversations.length}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Messages</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalMessages}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Files Shared</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalFiles}
            </div>
          </div>
        </div>

        {/* Editable Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-role"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Role / Specialty
              </label>
              <input
                id="profile-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={80}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-email"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Workspace Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={100}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-bio"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Focus & Context Note
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500/60 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
