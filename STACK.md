# STACK.md — Stack Decision Record
archetype: portal-launcher
modifiers: []
decided: 2026-09-02
kb_version: 2026-09-02
decided_by: bsa emit (phase 7 retrofit)

## Required (build MUST use these)
- zod — registry-schema-validator
- linkinator — broken-link-verifier

## Optional
- astro — static-site-generator [alternative]
- @11ty/eleventy — static-site-generator [alternative]

## Forbidden (build MUST NOT do these)
- duplicated-html-cards
- unvalidated-portal-links
- heavy-spa-framework-for-launcher

## Waivers
- zod: portal's `projects.json` registry is read and rendered with no schema
  validation as of 2026-09-02 retrofit; a malformed entry could still render a
  broken card silently; not required to change, recorded for visibility per D3.
- linkinator: no automated link-check step in the publish pipeline found; broken
  card links would currently only surface via manual click-through, 2026-09-02.
