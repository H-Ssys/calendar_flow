import React, { useState, useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import {
    startOfWeek, addDays, format, isSameDay,
    differenceInCalendarDays, subDays, isAfter
} from 'date-fns';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChevronDown, ChevronUp, Flame, TrendingUp, Target, Zap, Star, FileText, AlertCircle } from 'lucide-react';

const chartConfig = {
    completed: {
        label: 'Completed',
        color: 'hsl(var(--primary))',
    },
} satisfies ChartConfig;

export const ActivityDashboard: React.FC = () => {
    const { tasks } = useTaskContext();
    const [isOpen, setIsOpen] = useState(true);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    // Bar chart data: tasks completed per day this week
    const chartData = useMemo(() => {
        const data = [];
        for (let i = 0; i < 7; i++) {
            const day = addDays(weekStart, i);
            // Count tasks whose status is 'done' (use dueDate as proxy for completion day)
            const count = tasks.filter(t =>
                t.status === 'done' && t.dueDate && isSameDay(new Date(t.dueDate), day)
            ).length;
            data.push({
                day: format(day, 'EEE'),
                completed: count,
            });
        }
        return data;
    }, [tasks, weekStart]);

    // Stats
    const stats = useMemo(() => {
        const doneTasks = tasks.filter(t => t.status === 'done');
        const completionRate = tasks.length > 0
            ? Math.round((doneTasks.length / tasks.length) * 100)
            : 0;

        // Streak: consecutive days (backwards from today) with ≥1 done task
        let streak = 0;
        let checkDate = new Date();
        for (let i = 0; i < 365; i++) {
            const dayDone = tasks.some(t =>
                t.status === 'done' && t.dueDate && isSameDay(new Date(t.dueDate), checkDate)
            );
            if (dayDone) {
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                break;
            }
        }

        const weekCompleted = chartData.reduce((sum, d) => sum + d.completed, 0);
        const avgPerDay = weekCompleted > 0 ? (weekCompleted / 7).toFixed(1) : '0';

        // Outcome metrics
        const doneWithOutcome = doneTasks.filter(t => t.actualResult && t.actualResult.trim().length > 0);
        const outcomeRate = doneTasks.length > 0
            ? Math.round((doneWithOutcome.length / doneTasks.length) * 100)
            : 0;

        const ratedTasks = doneTasks.filter(t => t.outcomeRating != null);
        const avgRating = ratedTasks.length > 0
            ? (ratedTasks.reduce((sum, t) => sum + (t.outcomeRating || 0), 0) / ratedTasks.length).toFixed(1)
            : '—';

        const reviewPending = doneTasks.filter(t => !t.actualResult || t.actualResult.trim().length === 0).length;

        return { completionRate, streak, weekCompleted, avgPerDay, outcomeRate, avgRating, reviewPending };
    }, [tasks, chartData]);

    return (
        <div className="border border-border rounded-xl bg-background overflow-hidden">
            {/* Toggle header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Activity Dashboard</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {isOpen && (
                <div className="px-4 pb-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.weekCompleted}</p>
                                <p className="text-[11px] text-muted-foreground">This week</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Flame className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.streak}</p>
                                <p className="text-[11px] text-muted-foreground">Day streak</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Target className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.completionRate}%</p>
                                <p className="text-[11px] text-muted-foreground">Done rate</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.avgPerDay}</p>
                                <p className="text-[11px] text-muted-foreground">Avg / day</p>
                            </div>
                        </div>
                    </div>

                    {/* Outcome metrics row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.outcomeRate}%</p>
                                <p className="text-[11px] text-muted-foreground">Outcome rate</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <Star className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.avgRating}</p>
                                <p className="text-[11px] text-muted-foreground">Avg rating</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground leading-none">{stats.reviewPending}</p>
                                <p className="text-[11px] text-muted-foreground">Need review</p>
                            </div>
                        </div>
                    </div>

                    {/* Bar chart */}
                    <ChartContainer config={chartConfig} className="h-[120px] w-full">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                hide
                                allowDecimals={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="completed"
                                fill="var(--color-completed)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ChartContainer>
                </div>
            )}
        </div>
    );
};
