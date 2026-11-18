---
title: "Your LTI 1.3 Launch Works in the Sandbox and Fails on District Devices"
slug: lti-launch-cookies-district-devices
date: 2026-11-18
description: Why the OIDC state cookie breaks LTI 1.3 launches inside LMS iframes on iPads and managed Chromebooks, and the fallback chain that keeps the launch working.
author: Austin Buhl
tags:
  - edtech
  - lti
  - integrations
  - security
  - engineering
---

The ticket usually says "the tool won't load." Sometimes it says "it works for me but not for the kids." The vendor tests the launch from a developer's laptop in a Canvas sandbox, it works every time, and the ticket gets closed as "cannot reproduce." Then it comes back from a different school with the same screenshot: a blank iframe, or an error page that says the session is invalid.

I spent more than seven years in support at Stride/K12 before co-founding ClassQuip, and launch failures like this are frustrating because nothing is wrong with the product itself. The launch fails before the product ever loads. The good news is that it's easy to catch in review once you know where to look. In a lot of cases the cause is the same: the tool depends on a cookie inside a cross-site iframe, and the district's devices won't keep it.

This post goes deep on that one failure. If you want the broader picture of how LTI and OneRoster fit together, start with [OneRoster and LTI 1.3 in Plain English](/blog/oneroster-lti-plain-english/).

## What the launch actually needs to remember

An LTI 1.3 resource link launch is an OpenID Connect third-party initiated login, defined in the [1EdTech Security Framework](https://www.imsglobal.org/spec/security/v1p0/) and used by the [LTI 1.3 core spec](https://www.imsglobal.org/spec/lti/v1p3). Stripped down, it goes like this:

1. The LMS sends the browser to your login initiation URL with `iss`, `login_hint`, `target_link_uri`, and usually `lti_message_hint`, `client_id`, and `lti_deployment_id`.
2. Your tool generates a `state` and a `nonce`, stores them somewhere, and redirects to the platform's authorization endpoint with `response_mode=form_post` and `prompt=none`.
3. The platform POSTs an `id_token` (a signed JWT) and the `state` back to your redirect URI.
4. Your tool checks that the returned `state` matches what it stored in step 2, validates the JWT signature against the platform's JWKS, checks that the `nonce` claim hasn't been used before, and starts a session.

Step 4 is the one that breaks. The `state` check is your CSRF protection, and the spec is right to require it. The question is where you stored it in step 2. Almost every LTI library and tutorial uses a cookie, because that's how web apps normally carry state between two requests.

## Why the cookie disappears

In most course placements, all four steps happen inside an iframe on the LMS's domain. Your tool's domain is third-party in that frame. So the state cookie runs into two separate problems.

The first is SameSite. Step 3 is a cross-site POST from the platform to your tool. A cookie set with the default `SameSite=Lax` behavior is not sent on a cross-site POST, so it never reaches your redirect handler. The fix is `SameSite=None; Secure`, which is covered in MDN's [Set-Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie). Most teams get this right after the first round of bugs.

The second problem is the one that survives the fix. Some browsers refuse third-party cookies in iframes no matter which attributes you set.

- Safari has blocked all third-party cookies by default since 2020. WebKit explained the change in [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). That covers every school iPad, and on iOS it covers every browser, because they all run on WebKit.
- Chrome still allows third-party cookies by default for most users, which is why the developer's laptop works. But a district can turn on the [BlockThirdPartyCookies](https://chromeenterprise.google/policies/#BlockThirdPartyCookies) policy across its managed Chromebook fleet from the Google Admin console. When it does, students and staff can't override it.

That's the reproduction gap in one sentence. Your test machine is an unmanaged Chrome profile, and the district runs Safari on iPads or Chrome under an admin policy you can't see.

The same issue hits your app's session cookie after the launch succeeds. A tool that gets past the `state` check and then sets a normal session cookie will load the first page and then fail on the next request. To users that looks like "it loads, then kicks me out," which is even harder to diagnose from a ticket.

## The fallback chain

No single fix covers every browser and every LMS. What holds up is checking for options in order and falling back cleanly.

### 1. LTI Platform Storage, when the platform offers it

1EdTech published two small specs for exactly this problem: [LTI Client Side postMessages](https://www.imsglobal.org/spec/lti-cs-pm/v0p1) and [LTI Platform Storage](https://www.imsglobal.org/spec/lti-pm-s/v0p1). Instead of storing `state` in a cookie, the tool asks the platform to hold it for it, using `window.postMessage`.

The flow looks like this:

- Look for an `lti_storage_target` parameter on the login request. Its presence tells you the platform supports storage and which frame to send messages to.
- Send `lti.capabilities` and confirm that `lti.put_data` and `lti.get_data` are supported.
- In step 2, render a small page instead of a plain 302 redirect. That page calls `lti.put_data` with the state, then continues to the authorization endpoint.
- In step 4, render a page that calls `lti.get_data` and compares the stored value with the `state` the platform just posted. If they don't match, stop.

Canvas documents its implementation under "Launching without Cookies" in its [LTI launch overview](https://canvas.instructure.com/doc/api/file.lti_launch_overview.html). Two details from that page catch people. The storage messages go to the frame named in `lti_storage_target`, and their target origin is the platform's OIDC auth domain, not the institution's Canvas hostname. If you send them to the parent window or the wrong origin, you get silence, and silence looks like a hang.

The cost is that your `state` comparison now runs in client-side JavaScript instead of a server handler. Keep it narrow: one job, a short timeout, a clear error. Don't let it turn into a second login system.

### 2. Partitioned cookies where the browser supports them

[Partitioned cookies (CHIPS)](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies) let a third-party iframe keep a cookie that is keyed to the top-level site. Because every step of the LTI flow happens inside the same LMS page, a `state` cookie set with `SameSite=None; Secure; Partitioned` can survive in browsers that support the attribute, even when unpartitioned third-party cookies are blocked. Check MDN's compatibility table against the browsers your districts actually use, and test on a managed Chromebook with the policy turned on rather than trusting a desktop result.

### 3. A new window when nothing else works

If the platform doesn't send `lti_storage_target` and the cookie doesn't come back, the reliable fallback is a first-party context. Detect the failure, show a single "Open in a new window" button, and run the launch top-level, where your cookies are first-party again. The [Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API) can sometimes get you there without leaving the frame, but it needs a user gesture and its behavior differs by browser, so treat it as an upgrade, not the plan.

Whatever you choose, don't fall back to skipping the `state` check. A launch that "works" because validation was turned off is a security finding waiting for a district's IT review to discover.

### 4. Sessions that don't depend on the cookie

After the launch, mint a short-lived session token on the server, keep it in memory in the page, and send it as a header on API calls. That way the app keeps working inside the iframe without ever setting a cookie. Bind the token to the `(iss, deployment_id, context_id, sub)` tuple from the validated `id_token` so a token from one course can't be replayed in another.

## How to test it before the district does

The test matrix is small, and it's worth running before any pilot:

- Safari on an iPad, launched from inside the LMS course page, not from a direct link.
- A Chromebook (or a Chrome profile) with third-party cookies blocked, the way a managed device would have them.
- Each LMS you claim to support, with storage available and with it absent, so you know the fallback actually triggers.
- A second request after the launch, to catch the session cookie problem separately from the `state` problem.

Log which path each launch took: platform storage, partitioned cookie, new window, or failure. When a ticket comes in, that one field tells you more than the screenshot ever will.

## Where this fits

An LTI launch that fails on district hardware is one of the first things I check in a [District-Readiness Audit](/services/district-readiness-audit/), alongside roster sync, grade passback, and how live video behaves on filtered networks. It's two weeks, fixed fee, and you get a written list of what will break in a district review before a district finds it. If you have a pilot or an RFP coming up, details are on the [services page](/services/).