# CMS de Lore

O CMS separa semântica de lore e autorização.

- `classification` é apenas uma classificação narrativa: `publico`, `n_i`, `n_ii`, `n_iii`, `diretor`.
- `visibility` é o campo de permissão: `public`, `trivalente`, `instructor`, `director`, `council`, `founder`.
- Rotas públicas e funções públicas do servidor devem retornar apenas `cms_status = "published"` e `visibility = "public"`.
- Documentos restritos ficam ocultos em APIs públicas, cards, linhas do tempo, breadcrumbs, relações, buscas e sitemap.

Ciclo de vida dos documentos:

- `draft`: rascunho
- `published`: publicado
- `archived`: arquivado
- `obsolete`: obsoleto
- `trash`: lixeira

Exclusões são soft delete por padrão: entradas vão para `trash`. Exclusão permanente só é válida para entradas que já estão na lixeira.

O editor é dividido em módulos:

- `documents`: schemas e abas do editor
- `permissions`: política de classificação, visibilidade e status
- `relations`: controles de relacionamento entre documentos
- `history`: linha do tempo de versões e restauração

Registros de versão são armazenados em `lore_entry_versions` com autor, data, campos alterados e o registro anterior.
