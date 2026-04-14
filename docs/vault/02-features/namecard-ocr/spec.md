---
type: feature-spec
status: in_progress
---

# Namecard OCR — Task Spec

## Phase A: Database + Storage

| Task | Agent | Inputs | Outputs | Acceptance criteria |
|------|-------|--------|---------|---------------------|
| A1: Module scan | Codebase Scanner | src/contacts/, migrations/ | contacts-module.md | DONE (c9ba0c6) |
| A2: Vault artifacts | Feature Planner | scan + plan | brief/spec/reuse-map/contract | All 4 files exist, contract has multipart endpoint |
| A3: ADRs | System Architect | contract.md | adr-023, adr-024 | Two ADRs explain schema + crop library choices |
| A4: Security pre-audit | Security Officer | planned schema | audit report | Zero FAIL items |
| A5: Migration 013 | Backend Engineer | 001_core_tables.sql (existing) + audit | 013_namecard_dual_side.sql applied | 6 checkpoint items pass in Studio |
| A6: Storage buckets | Backend Engineer | .flow.env | contacts-cards + contact-avatars buckets | Cross-user 403 verified |
| A7: QA gate | QA Lead | Studio SQL | phase-a-qa-results.md | 5/5 checks PASS |

## Phase B: FastAPI OCR Endpoint

| Task | Agent | Key constraint |
|------|-------|---------------|
| B1: OCR router | Backend Engineer | multipart/form-data, gemini-3.1-flash-lite, response_mime_type JSON |
| B2: Batch endpoint | Backend Engineer | Semaphore(5), Celery job, status polling |
| B3: Security audit | Security Officer | JWT on all endpoints, no VITE_ secrets |
| B4: QA integration test | QA Lead | curl tests against local server |
| B5: Deploy to VPS | Release Engineer | docker rebuild flow-api, health check |

## Phase C: Frontend Pipeline

| Task | Agent | Key constraint |
|------|-------|---------------|
| C1: Install deps | MANUAL | react-advanced-cropper, heic2any, browser-image-compression |
| C2: CardCropEditor design | Antigravity | Uses react-advanced-cropper (NOT react-cropper) |
| C3: useCardProcessor hook | Frontend Engineer | HEIC convert → resize → mock mode → OCR state machine |
| C4: Wire cropper | Frontend Engineer | Replace any placeholder with Cropper from react-advanced-cropper |
| C5: Wire ScanCardForm.handleExtract | Frontend Engineer | Replace setTimeout mock with real useCardProcessor call |
| C6: Wire NewContactForm OCR consent | Frontend Engineer | Use existing prefill() seam for OCR auto-fill |
| C7: Wire BatchUploadForm.handleExtractAll | Frontend Engineer | Replace mock with batch endpoint + job polling |
| C8: Integration test (remove mock) | Full-Stack Integrator | VITE_OCR_MOCK removed, end-to-end verified |

## Phase D: Contact Detail Redesign

| Task | Agent | Key constraint |
|------|-------|---------------|
| D0: Refactor ContactDetail.tsx | Refactor Specialist | Currently 435 lines — split before Phase D additions push it over 500 |
| D1: ContactCardImages | Antigravity | Replace base64 URLs with Supabase Storage URLs |
| D2: SocialPlatforms | Antigravity | jsonb array stored in contacts.socials |
| D3: ContactReferences + ContactFlow | Antigravity | Two components, both use Supabase |
| D4: Wire all into ContactDetail | Frontend Engineer | Update Contact type to include user_id + new fields |
| D5: Update ContactContext | Frontend Engineer | Replace MOCK_CONTACTS with Supabase query; use active_contacts view |
| D6: Search integration | Full-Stack Integrator | Both tsvector columns OR'd in query |
| D7: QA regression (14 checks) | QA Lead | All existing + new functionality |
| D8: Deploy | Release Engineer | scp + docker cp + tag v2.5.0-smart-contacts |

## Pre-scan schema reference (embedded for agent reference)

From `grep -A 30 "CREATE TABLE.*contacts" supabase/migrations/001_core_tables.sql`:

Columns that ALREADY exist in `public.contacts` — migration 013 MUST NOT re-add:
`id, user_id, team_id, name, email, phone, company, title, address, website,
industry, reference, notes, avatar_color, is_favorite, is_verified,
front_image_url, back_image_url, tel_phone, fax, other_phone, other_email,
tags, fts, created_at, updated_at`.

Columns migration 013 MUST ADD COLUMN IF NOT EXISTS:
`front_ocr jsonb, back_ocr jsonb, alt_language text, socials jsonb,
phones jsonb, pipeline_stage text, bio text, birthday date,
last_contacted_at timestamptz, deleted_at timestamptz,
reference_search_text tsvector, search_text tsvector GENERATED`.

RLS is already enabled in 001. Migration 013 adds policies for the new
`contact_references` table only (the base `contacts` policies remain in 006).
