---
title: A draft, for demonstration
date: 2026-03-16
authors: [you]
category: Research Notes
tags: [guide]
summary: This post has draft set to true, so it is visible in development and absent from every build.
draft: true
---

If you can read this on the deployed site, something is wrong with the draft
filter. `npm run dev` shows it; `npm run build` leaves it out of `dist/`, the
feed and the sitemap, and strips its text and title from the bundle as well.

Drafts are useful for the half-written thing you want to look at in a browser
without deciding whether it is finished.
