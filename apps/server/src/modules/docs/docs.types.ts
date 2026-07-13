export interface DocSpaceRow {
  id: string;
  projectId: string | null;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  defaultVersionId: string | null;
  repositoryFullName: string | null;
  sourceMode: string;
  docsRoot: string;
  isPublished: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
}

export interface DocVersionRow {
  id: string;
  spaceId: string;
  version: string;
  label: string;
  sourceRef: string | null;
  status: string;
  isDefault: number;
  isDeprecated: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRow {
  id: string;
  spaceId: string;
  versionId: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  description: string | null;
  contentMd: string;
  status: string;
  visibility: string;
  sortOrder: number;
  depth: number;
  sourceType: string;
  sourcePath: string | null;
  sourceSha: string | null;
  editUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
