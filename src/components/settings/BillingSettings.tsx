import React, { useState } from 'react';
import { CreditCard, Check, Plus, Receipt, Crown, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type PlanId = 'starter' | 'professional' | 'enterprise';
type BillingCycle = 'monthly' | 'annually';

interface PlanCardProps {
    id: PlanId;
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    description: string;
    features: string[];
    isPopular?: boolean;
    currentPlan: PlanId;
    cycle: BillingCycle;
    onSelect: (id: PlanId) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ id, name, monthlyPrice, annualPrice, description, features, isPopular, currentPlan, cycle, onSelect }) => {
    const isCurrent = currentPlan === id;
    const price = cycle === 'monthly' ? monthlyPrice : annualPrice;

    return (
        <div className={`relative flex flex-col p-6 rounded-2xl border ${isCurrent ? 'border-blue-600 bg-blue-50/10' : 'border-border bg-card'} shadow-sm transition-all hover:shadow-md`}>
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most Popular
                </div>
            )}
            <div className="mb-5">
                <h4 className="text-lg font-bold text-foreground mb-1">{name}</h4>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">${price}</span>
                <span className="text-muted-foreground text-sm font-medium">/mo</span>
                {cycle === 'annually' && monthlyPrice > 0 && (
                    <span className="ml-2 text-xs text-green-600 font-bold">Save ${(monthlyPrice - annualPrice) * 12}/yr</span>
                )}
            </div>
            <div className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{feature}</span>
                    </div>
                ))}
            </div>
            <Button
                className={`w-full font-bold h-10 ${isCurrent ? 'bg-muted text-muted-foreground' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                disabled={isCurrent}
                onClick={() => onSelect(id)}
            >
                {isCurrent ? 'Current Plan' : 'Upgrade Now'}
            </Button>
        </div>
    );
};

export const BillingSettings: React.FC = () => {
    // Stub UI — plan/cycle selection is in-memory only
    const [currentPlan, setCurrentPlan] = useState<PlanId>('professional');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

    const prices: Record<PlanId, { monthly: number; annual: number }> = {
        starter: { monthly: 0, annual: 0 },
        professional: { monthly: 24, annual: 19 },
        enterprise: { monthly: 99, annual: 79 },
    };

    const currentPrice = billingCycle === 'monthly' ? prices[currentPlan].monthly : prices[currentPlan].annual;

    return (
        <div className="max-w-6xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-10 text-foreground">Billing & Subscription</h1>

            <div className="space-y-12">
                {/* Current Plan Overview */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Your subscription is active</h2>
                        <p className="text-blue-100 text-sm max-w-md">Enjoy unlimited calendar sync, custom scheduling links, and AI-powered meeting optimization.</p>
                    </div>
                    <div className="flex flex-col gap-3 relative z-10 min-w-[200px]">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <span className="text-xs font-medium block opacity-70 mb-1">Next payment</span>
                            <span className="text-xl font-bold block">${currentPrice.toFixed(2)}</span>
                            <span className="text-[10px] font-medium opacity-60">on Feb 15, 2026</span>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
                </div>

                {/* Plan Selection */}
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-foreground leading-tight">Choose a Plan</h3>
                            <p className="text-sm text-muted-foreground">Select the best options for your scheduling needs.</p>
                        </div>
                        <div className="flex items-center gap-0 bg-muted/50 p-1.5 rounded-2xl border border-border">
                            <button
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
                                onClick={() => setBillingCycle('monthly')}
                            >
                                Monthly
                            </button>
                            <div className="flex items-center gap-2 px-2">
                                <button
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${billingCycle === 'annually' ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}
                                    onClick={() => setBillingCycle('annually')}
                                >
                                    Annually
                                </button>
                                <span className="text-[9px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">Save 20%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PlanCard
                            id="starter"
                            name="Starter"
                            monthlyPrice={0}
                            annualPrice={0}
                            description="Perfect for individuals just getting started."
                            features={['1 Calendar account', 'Basic scheduling links', 'Limited meeting rooms', 'Community support']}
                            currentPlan={currentPlan}
                            cycle={billingCycle}
                            onSelect={setCurrentPlan}
                        />
                        <PlanCard
                            id="professional"
                            name="Professional"
                            monthlyPrice={24}
                            annualPrice={19}
                            description="Best for professionals and growing teams."
                            features={['Unlimited calendars', 'Custom link slugs', 'AI Flex scheduling', 'Priority email support']}
                            isPopular={true}
                            currentPlan={currentPlan}
                            cycle={billingCycle}
                            onSelect={setCurrentPlan}
                        />
                        <PlanCard
                            id="enterprise"
                            name="Enterprise"
                            monthlyPrice={99}
                            annualPrice={79}
                            description="Advanced features for large organizations."
                            features={['Single Sign-On (SSO)', 'Advanced analytics', 'Dedicated manager', '99.9% uptime SLA']}
                            currentPlan={currentPlan}
                            cycle={billingCycle}
                            onSelect={setCurrentPlan}
                        />
                    </div>
                </div>

                {/* Payment Methods & History Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-border">
                    {/* Payment Method */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground leading-tight">Payment Method</h3>
                            <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 h-8 gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                Add New
                            </Button>
                        </div>
                        <div className="p-5 border border-border rounded-2xl bg-muted/10 flex items-center justify-between group hover:border-blue-200 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 bg-black rounded-md flex items-center justify-center text-white font-bold text-[10px] tracking-widest">
                                    VISA
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-foreground block">•••• •••• •••• 4242</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Expires 12/28</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded border border-green-100">Default</span>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                                    <Receipt className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Billing History */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-foreground leading-tight">Billing History</h3>
                        <div className="space-y-3">
                            {[
                                { date: 'Jan 15, 2026', id: 'INV-4291', amount: `$${currentPrice.toFixed(2)}` },
                                { date: 'Dec 15, 2025', id: 'INV-3182', amount: `$${currentPrice.toFixed(2)}` },
                                { date: 'Nov 15, 2025', id: 'INV-2847', amount: `$${currentPrice.toFixed(2)}` },
                            ].map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground">{invoice.date}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">{invoice.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-foreground">{invoice.amount}</span>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                            <Receipt className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
