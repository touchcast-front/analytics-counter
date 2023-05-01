---
'@segment/analytics-next': minor
---

Fix stale page context information for buffered events, so page data is resilient to quick navigation changes. Remove page enrichment plugin. Fix bug in track event where properties like `{ title: 'foo', url: 'bar' }` would override context.page.title and context.page.url. 
