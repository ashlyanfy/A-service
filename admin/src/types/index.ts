export type UserRole = "ADMIN" | "MANAGER";
export type Language = "ru" | "kk";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  language: Language;
  created_at: string;
}

export type LeadStatus =
  | "NEW"
  | "QUALIFIED"
  | "PROPOSAL"
  | "IN_PROGRESS"
  | "WON"
  | "DONE"
  | "CANCELLED"
  | "DECLINED";

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string | null;
  author: User | null;
  body: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  category: string | null;
  subtask: string | null;
  city: string | null;
  quantity: string | null;
  preferred_date: string | null;
  message: string | null;
  source_page: string | null;
  locale: string | null;
  attachment_name: string | null;
  status: LeadStatus;
  deal_amount: string | null;
  source: string | null;
  ip: string | null;
  user_agent: string | null;
  assignee_id: string | null;
  assignee: User | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDetail extends Lead {
  notes: LeadNote[];
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
}

export interface LeadStats {
  new: number;
  qualified: number;
  proposal: number;
  in_progress: number;
  won: number;
  done: number;
  cancelled: number;
  declined: number;
  total: number;
}

export interface LeadDailyResponse {
  points: { date: string; count: number }[];
}

export type SiteEventType = "PAGE_VIEW" | "WHATSAPP" | "CALL" | "QUOTE_OPEN" | "LEAD_SUBMIT";

export interface SiteEvent {
  id: string;
  event_type: SiteEventType;
  page: string | null;
  visitor_id: string;
  created_at: string;
}

export interface SiteEventListResponse {
  items: SiteEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface SiteEventStats {
  page_view: number;
  whatsapp: number;
  call: number;
  quote_open: number;
  lead_submit: number;
  unique_visitors: number;
  total_actions: number;
}

export interface VisitsDailyResponse {
  points: { date: string; views: number; visitors: number }[];
}

export interface PageBreakdownItem {
  page: string;
  views: number;
  whatsapp: number;
  call: number;
  quote_open: number;
  lead_submit: number;
  total: number;
}

export interface PageBreakdownResponse {
  items: PageBreakdownItem[];
}

export interface SalesDailyResponse {
  points: { date: string; total: number; count: number }[];
  total: number;
}

export interface ContentBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
  order: number;
  enabled: boolean;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  blocks: ContentBlock[];
  created_at: string;
  updated_at: string;
}

export interface PageListItem {
  id: string;
  slug: string;
  title: string;
  updated_at: string;
}

export interface Seo {
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image: string | null;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface SearchResults {
  leads: { id: string; name: string; phone: string; status: string }[];
  pages: { slug: string; title: string; block_id: string; block_type: string; snippet: string }[];
}
