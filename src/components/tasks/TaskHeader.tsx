import React from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { TaskStatus, TaskPriority, TASK_COLUMNS, PRIORITY_CONFIG } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, LayoutGrid, List, Plus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface TaskHeaderProps {
    onAddTask: (e: React.MouseEvent) => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ onAddTask }) => {
    const {
        tasks,
        overdueTasks,
        viewMode,
        setViewMode,
        filterStatus,
        setFilterStatus,
        filterPriority,
        setFilterPriority,
        searchQuery,
        setSearchQuery,
    } = useTaskContext();

    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;

    return (
        <div className="border-b border-border bg-background px-4 py-3 space-y-3">
            {/* Top Row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-foreground">Tasks</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="gap-1 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {doneTasks}/{totalTasks}
                        </Badge>
                        {overdueTasks.length > 0 && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertCircle className="w-3 h-3" />
                                {overdueTasks.length} overdue
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-1.5 transition-colors ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                            title="Board view"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                            title="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <Button onClick={(e) => onAddTask(e)} size="sm" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Filter Row */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 max-w-xs border border-input rounded-lg px-3 h-8 bg-background focus-within:ring-2 focus-within:ring-ring">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                </div>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | 'all')}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {TASK_COLUMNS.map(col => (
                            <SelectItem key={col.id} value={col.id}>
                                {col.emoji} {col.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | 'all')}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                                {cfg.emoji} {cfg.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
