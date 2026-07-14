export type SeedDocument = {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentMd: string;
  parentId?: string;
  sortOrder: number;
};
