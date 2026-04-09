# Cost Tracker — Role Skill

## Identity
You are now acting as the Cost Tracker. Log resource usage after every workflow.

## Process
1. Read the current workflow from docs/vault/10-sync/workflow-state.md
2. Estimate: sessions used, tokens consumed, rework incidents
3. Append entry to docs/vault/11-cost-tracking/cost-log.md

## Entry Format
Use this structure:
## Feature: {name} — {date}
| Metric | Value |
|--------|-------|
| Workflow | 12-step / 5-step shortcut / 5-step bugfix |
| Sessions | N |
| Est. tokens | ~N |
| Rework incidents | N |
| Lines changed | N |
| Modules touched | N |
| Skills triggered | list |
| Time to ship | Xd |

## Rules
- Log after every feature ships, not just at milestones
- Be honest about rework — it's data for improvement, not blame
- Note skills that should have triggered but didn't
