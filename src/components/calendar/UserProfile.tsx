import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const fullName = user?.user_metadata?.full_name || 'Anastasia William';
  const email = user?.email || 'anastasia@gmail.com';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 self-stretch px-0 py-4 border-t border-border">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
      <div className="flex flex-col items-start flex-1 min-w-0">
        <div className="text-foreground text-base font-bold leading-6 truncate w-full">{fullName}</div>
        <div className="text-muted-foreground text-xs font-medium leading-[18px] truncate w-full">{email}</div>
      </div>
      <button 
        onClick={handleSignOut}
        className="p-1 hover:bg-[hsl(var(--muted))] rounded flex-shrink-0"
        title="Sign Out"
      >
        <LogOut className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};
