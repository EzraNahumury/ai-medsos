export type IgProfile = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  account_type?: string;
};

export type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
};

export type IgComment = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
  parent_id?: string;
  replies?: { data?: IgComment[] };
};

export type IgInsightValue = {
  value?: number | Record<string, number>;
  end_time?: string;
};

export type IgInsightDatum = {
  name: string;
  period?: string;
  values?: IgInsightValue[];
  total_value?: { value?: number };
  title?: string;
  description?: string;
  id?: string;
};

export type IgInsightResponse = {
  data?: IgInsightDatum[];
};

export type NormalizedInsight = {
  views?: number;
  plays?: number;
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  totalInteractions?: number;
};

export type PagedResponse<T> = {
  data?: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
};

export type FacebookPage = {
  id: string;
  name?: string;
  access_token?: string;
};

export type PageInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};
