UPDATE doc_versions
SET label = '帮助中心'
WHERE version = 'latest' AND is_default = 1 AND label = 'Latest';
--> statement-breakpoint
WITH RECURSIVE document_roots(id, root_id, level) AS (
  SELECT id, id, 0
  FROM documents
  WHERE parent_id IS NULL
  UNION ALL
  SELECT child.id, document_roots.root_id, document_roots.level + 1
  FROM documents child
  JOIN document_roots ON child.parent_id = document_roots.id
)
UPDATE documents
SET parent_id = (
      SELECT root_id
      FROM document_roots
      WHERE document_roots.id = documents.id
    ),
    depth = 1
WHERE id IN (
  SELECT id
  FROM document_roots
  WHERE level > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_spaces_project_id
  ON doc_spaces(project_id)
  WHERE project_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_spaces_repository_full_name
  ON doc_spaces(repository_full_name)
  WHERE repository_full_name IS NOT NULL AND repository_full_name <> '';
