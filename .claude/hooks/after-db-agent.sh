#!/bin/bash
# Runs after db-agent completes — applies migrations and runs tests

echo "=== DB Agent completed. Applying migrations... ==="
cd "E:\Calendar Platform"
supabase db push

echo "=== Running RLS policy tests... ==="
supabase test

echo "=== Done. Check state/phase-0.md for summary. ==="
