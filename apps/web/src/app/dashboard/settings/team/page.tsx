'use client';

import { useState } from 'react';

type Member = {
    id: string;
    name: string;
    email: string;
    role: 'OWNER' | 'MEMBER';
    joinedAt: string;
    avatar: string;
};

const MOCK_MEMBERS: Member[] = [
    { id: '1', name: 'Sarah Chen', email: 'sarah@myagency.com', role: 'OWNER', joinedAt: '2024-01-15', avatar: 'SC' },
    { id: '2', name: 'Marcus Johnson', email: 'marcus@myagency.com', role: 'MEMBER', joinedAt: '2024-03-22', avatar: 'MJ' },
];

export default function TeamPage() {
    const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'OWNER' | 'MEMBER'>('MEMBER');
    const [inviting, setInviting] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviting(true);
        // TODO: POST /api/invites
        await new Promise(r => setTimeout(r, 800));
        setInviting(false);
        setInviteSent(true);
        setInviteEmail('');
        setTimeout(() => setInviteSent(false), 4000);
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Remove this team member?')) return;
        // TODO: DELETE /api/org-members/:id
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    const handleRoleChange = async (id: string, role: 'OWNER' | 'MEMBER') => {
        // TODO: PATCH /api/org-members/:id
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    };

    const COLORS = ['bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-blue-600'];

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-1">Team Members</h2>
            <p className="text-gray-400 text-sm mb-8">Manage who has access to your organization</p>

            {/* Members List */}
            <div className="space-y-3 mb-8">
                {members.map((member, i) => (
                    <div key={member.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${COLORS[i % COLORS.length]} flex items-center justify-center text-sm font-bold text-white`}>
                                {member.avatar}
                            </div>
                            <div>
                                <p className="font-medium text-white text-sm">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as 'OWNER' | 'MEMBER')}
                                className="text-xs px-3 py-1.5 bg-gray-800 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="OWNER">Owner</option>
                                <option value="MEMBER">Member</option>
                            </select>
                            {member.role !== 'OWNER' && (
                                <button
                                    onClick={() => handleRemove(member.id)}
                                    className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Invite Form */}
            <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white mb-4">Invite Team Member</h3>
                <form onSubmit={handleInvite} className="flex gap-3">
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@email.com"
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        required
                    />
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'OWNER' | 'MEMBER')}
                        className="px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="MEMBER">Member</option>
                        <option value="OWNER">Owner</option>
                    </select>
                    <button
                        type="submit"
                        disabled={inviting}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-all whitespace-nowrap"
                    >
                        {inviting ? 'Sending…' : 'Send Invite'}
                    </button>
                </form>
                {inviteSent && (
                    <p className="mt-2 text-sm text-green-400">✓ Invitation sent successfully</p>
                )}
            </div>
        </div>
    );
}
