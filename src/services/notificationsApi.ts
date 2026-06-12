import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export interface NotificationsPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** Raw notification from API (supports common field names). */
export interface ApiNotification {
  id: number | string;
  title?: string;
  body?: string;
  message?: string;
  content?: string;
  type?: string;
  is_read?: boolean;
  read?: boolean;
  read_at?: string | null;
  readAt?: string | null;
  created_at?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
}

export interface GetNotificationsArgs {
  page?: number;
  perPage?: number;
  unreadOnly?: 0 | 1;
}

export interface GetNotificationsResponse {
  success: boolean;
  notifications: ApiNotification[];
  pagination: NotificationsPagination;
  unreadCount: number;
}

export interface MarkNotificationReadResponse {
  success: boolean;
}

export interface MarkAllNotificationsReadResponse {
  success: boolean;
  updated?: number;
}

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  when: string;
  isRead: boolean;
  type?: string;
  event?: string;
  payload?: Record<string, string>;
};

/** Normalize list response (camelCase / snake_case / nested `data`). */
export function parseNotificationsResponse(
  raw: unknown,
): GetNotificationsResponse {
  const root =
    raw != null && typeof raw === 'object' && 'data' in (raw as object)
      ? (raw as {data: unknown}).data
      : raw;
  const body =
    root != null && typeof root === 'object'
      ? (root as Record<string, unknown>)
      : {};

  const notifications = Array.isArray(body.notifications)
    ? (body.notifications as ApiNotification[])
    : [];

  const paginationRaw =
    body.pagination != null && typeof body.pagination === 'object'
      ? (body.pagination as Record<string, unknown>)
      : {};

  const pagination: NotificationsPagination = {
    page: Number(paginationRaw.page ?? 1),
    perPage: Number(paginationRaw.perPage ?? paginationRaw.per_page ?? 15),
    total: Number(paginationRaw.total ?? notifications.length),
    totalPages: Number(
      paginationRaw.totalPages ?? paginationRaw.total_pages ?? 1,
    ),
  };

  const unreadFromApi = body.unreadCount ?? body.unread_count;
  let unreadCount =
    typeof unreadFromApi === 'number' ? unreadFromApi : Number(unreadFromApi);

  if (!Number.isFinite(unreadCount)) {
    unreadCount = notifications.filter(n => {
      const read = n.is_read ?? n.read;
      const hasReadAt = n.read_at != null || n.readAt != null;
      return !(read || hasReadAt);
    }).length;
  }

  return {
    success: Boolean(body.success ?? true),
    notifications,
    pagination,
    unreadCount,
  };
}

function mapNotificationPayload(
  raw: ApiNotification,
): Record<string, string> | undefined {
  const source =
    raw.data != null && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : undefined;
  if (!source) {
    return undefined;
  }

  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value != null) {
      payload[key] = String(value);
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function mapApiNotification(raw: ApiNotification): NotificationListItem {
  const isRead = Boolean(
    raw.is_read ?? raw.read ?? (raw.read_at != null || raw.readAt != null),
  );
  const payload = mapNotificationPayload(raw);
  const event =
    payload?.event ??
    (typeof raw.type === 'string' ? raw.type : undefined);

  return {
    id: String(raw.id),
    title: raw.title ?? raw.type ?? 'Notification',
    body: raw.body ?? raw.message ?? raw.content ?? '',
    when: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    isRead,
    type: raw.type,
    event,
    payload,
  };
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['Notifications'],
  endpoints: builder => ({
    getNotifications: builder.query<GetNotificationsResponse, GetNotificationsArgs | void>({
      query: ({
        page = 1,
        perPage = 15,
        unreadOnly = 0,
      } = {}) => ({
        url: '/notifications',
        method: 'GET',
        params: {page, perPage, unreadOnly},
      }),
      transformResponse: (response: unknown) =>
        parseNotificationsResponse(response),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<
      MarkNotificationReadResponse,
      string | number
    >({
      query: id => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<
      MarkAllNotificationsReadResponse,
      void
    >({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
