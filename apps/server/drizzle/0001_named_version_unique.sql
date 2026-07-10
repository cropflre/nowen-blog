CREATE UNIQUE INDEX IF NOT EXISTS uq_post_versions_post_version
ON post_versions(post_id, version);
