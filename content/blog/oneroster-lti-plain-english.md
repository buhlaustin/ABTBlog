---
title: "OneRoster and LTI 1.3 in Plain English (For Engineers Who’ve Only Read the Spec)"
slug: oneroster-lti-plain-english
date: 2026-10-28
description: Roster drift, launch context, and token lifetimes—the failure modes I keep seeing when LMS tools meet district SIS reality.
author: Austin Buhl
tags:
  - edtech
  - lti
  - oneroster
  - integrations
---

If you’ve skimmed the **LTI 1.3** and **OneRoster** specs, you know the vocabulary: platforms, tools, deployments, NRPS, AGS, OAuth2, JWT claims, `sourcedId`, `role` vocabularies. What the specs don’t hand you is **district reality**—partial roster feeds, teachers who roster late, students who exist in the LMS but not in the SIS export you got at 2 a.m., and launch URLs copied from last semester’s course shell.

This post is the cheat sheet I wish I had before years of integration fire drills.

## Two pipes, one classroom

Think of K–12 integrations as two parallel pipes into your app:

**OneRoster (rostering)** — *Who exists, in which class, with which role, for which term?*  
**LTI (launch)** — *Who is clicking into the tool right now, from which course context, with what permissions?*

They’re related but not identical. OneRoster is batch/sync truth (with delays). LTI is moment-of-launch truth (with cookies and redirects). Production bugs almost always come from **assuming they’re the same truth at the same time**.

## LTI 1.3: what actually happens on launch

Plain sequence:

1. Teacher or student clicks your tool inside Canvas, Brightspace, Moodle, etc.
2. The LMS starts an OIDC login flow; your tool receives an **`id_token`** (JWT) with claims: subject, roles, context (course id), sometimes resource link id, deployment id.
3. You map that identity to an internal user record and attach them to the **context** (section/course) the LMS thinks they’re in.
4. Optional but common in K–12: you call **Names and Roles Provisioning Services (NRPS)** to list members of that context for seating charts, breakout assignment, or attendance.

What engineers miss:

**Deployment vs. client id vs. issuer.** Districts clone courses, copy cartridges, and run multiple environments (prod vs. sandbox). If you key integrations on the wrong identifier, you’ll authenticate successfully and still land users in the wrong tenant partition.

**Role claims are not job titles.** `Learner`, `Instructor`, `TeachingAssistant`, `Administrator`—and vendor extensions—drive authorization. A parent portal or observer role misclassified as `Learner` breaks moderation features silently.

**Deep linking vs. static launches.** A static placement works until instructional design wants per-assignment launches with grade return. **Assignment and Grade Services (AGS)** adds another long-lived relationship: line items, scores, and the expectation that your tool knows which LMS column maps to which activity.

**Session lifetime vs. class period.** JWTs expire. Teachers keep tabs open across prep and lunch. If your session model assumes “login once per day,” you’ll get ghost attendance or duplicate identities when refresh paths aren’t clean.

## OneRoster: what the CSV/API is really saying

OneRoster models **orgs, users, courses, classes (sections), enrollments**. The mental model:

- A **user** has a stable `sourcedId` (until districts merge duplicates—then all bets are off).
- A **class** ties a course offering to a term and school.
- An **enrollment** links user → class with role and active date bounds.

Districts sync on schedules you don’t control—nightly, hourly, or “when someone clicks sync.” That means:

**Roster lag is normal.** A student added in the SIS at 8:05 may not appear in your database until the next sync. LTI might still launch them if the LMS roster is ahead of your copy. Your product must decide: trust launch, trust roster, or reconcile.

**Inactive enrollments are messy.** End-dated enrollments, transfers mid-year, and cross-listed sections show up as edge cases in every integration. “Count active enrollments” needs explicit rules, not `SELECT *`.

**Org hierarchy matters for admin scope.** A principal, district admin, and teacher see different slices of the tree. Authorization that only checks course membership will leak or over-restrict.

## Three failure modes I see repeatedly

### 1. Roster drift

**Symptom:** Teacher sees 28 students in the LMS; your seating chart shows 25; three kids error on launch.  
**Cause:** OneRoster sync stale, manual LMS enrollment, or different definitions of “active.”  
**Engineering response:** Per-context member refresh (NRPS on launch or scheduled reconcile), visible “last synced” for admins, graceful handling for “user in launch but not in roster cache” with audit log—not a opaque 403.

### 2. Wrong context, right user

**Symptom:** Student opens tool from Course A but lands in last week’s Course B room.  
**Cause:** Deep link/resource link mismatch, browser session reuse, or course copy without new deployment mapping.  
**Engineering response:** Bind session to `(issuer, deployment_id, context_id)` tuple; never infer context from user alone.

### 3. Grade return without a stable line item

**Symptom:** Scores post to the wrong column or vanish on course copy.  
**Cause:** AGS line items not recreated per resource link; teachers duplicate assignments.  
**Engineering response:** Idempotent line-item creation keyed to resource link id; admin tooling to re-link when shells are copied.

## Privacy and compliance (the non-optional layer)

K–12 means **FERPA**-shaped thinking even when you’re not lawyers: minimize what you store, know why you store it, tie retention to enrollment lifecycle, and make audit logs for who accessed which student record. **COPPA** enters when under-13 workflows or parent consent chains appear—your vendor contracts and data map should match what engineering actually logs.

OAuth secrets, key rotation, and per-district credentials belong in runbooks, not in a single `.env` on someone’s laptop.

## How we design around this at ClassQuip

Without turning this into a product sheet: the pattern is **launch-first identity, roster-backed authority**. LTI tells us who knocked and which classroom door they used; OneRoster (and NRPS where needed) backs membership, roles, and compliance reporting over time. When the two disagree, we **log, surface, and reconcile**—because teachers shouldn’t be the human diff engine between systems.

If you’re integrating an LMS for the first time, read the specs—but spend equal time with a **support queue**. The spec is the grammar; tickets are the literature.

## Further reading (official sources)

- [1EdTech LTI 1.3 documentation](https://www.imsglobal.org/activity/learning-tools-interoperability)
- [OneRoster® specification](https://www.imsglobal.org/activity/onerosterlis)

If you want a follow-up post on a specific LMS (Canvas vs. Brightspace launch quirks) or a deep dive on NRPS vs. bulk OneRoster sync strategies, say which district shape you care about—charter single-tenant vs. large multi-district SSO—and I’ll write to that.
