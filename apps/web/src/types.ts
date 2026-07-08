import type {
  PostSummary,
  PostDetail,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
} from '@blog/shared';

export type {
  PostSummary,
  PostDetail,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
};

export interface CategoryView extends Category {
  postCount: number;
}

export interface TagView extends Tag {
  postCount: number;
}

export interface ArchiveMonth {
  month: number;
  total: number;
  posts: PostSummary[];
}

export interface ArchiveYear {
  year: number;
  total: number;
  months: ArchiveMonth[];
}
