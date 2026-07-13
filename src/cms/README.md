# CMS Lore Management

The CMS separates lore semantics from authorization.

- `classification` is a lore label only: `publico`, `n_i`, `n_ii`, `n_iii`, `diretor`.
- `visibility` is the permission field: `public`, `trivalente`, `instructor`, `director`, `council`, `founder`.
- Public routes and public server functions must return only `cms_status = "published"` and `visibility = "public"`.
- Restricted documents are hidden from public APIs, cards, timelines, breadcrumbs, relations, search, and sitemap.

Document lifecycle:

- `draft`
- `published`
- `archived`
- `obsolete`
- `trash`

Deletes are soft deletes by default: entries move to `trash`. Permanent delete is only valid for entries already in trash.

The editor is split into modules:

- `documents`: schemas and editor tabs
- `permissions`: classification, visibility, and status policy
- `relations`: document relationship controls
- `history`: version timeline and restore controls

Version snapshots are stored in `lore_entry_versions` with author, timestamp, changed fields, and the previous snapshot.
