import React from 'react';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { PageHeaderRight } from '@/components/PageHeaderRight';
import { Users, Plus } from 'lucide-react';

const mockTeams = [
  { id: '1', name: 'Fami', initials: 'F', color: '#EC4899' },
];

const Teams: React.FC = () => {
  return (
    <div className="flex w-full h-screen bg-background overflow-hidden relative">
      <CalendarSidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Teams List Sidebar */}
        <div className="w-[280px] border-r border-border flex flex-col bg-background shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">My Teams</h2>
            <button className="p-1 hover:bg-muted rounded transition-colors" title="Create team">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="flex flex-col gap-0.5">
              {mockTeams.map(team => (
                <button 
                  key={team.id} 
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted border border-transparent"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" 
                    style={{ backgroundColor: team.color }}
                  >
                    {team.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeaderRight />
          
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Welcome to Teams</h2>
              <p className="text-sm text-muted-foreground max-w-xs">Select a team from the sidebar or create one to get started</p>
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Your First Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;
