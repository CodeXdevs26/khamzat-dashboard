import { baseApi } from "./baseApi";

const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // params: page, limit, read, sortBy, orderBy
    getAllNotifications: builder.query({
      query: (params) => ({
        url: "/notifications",
        method: "GET",
        params,
      }),
      providesTags: ["notification"],
    }),
    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["notification"],
    }),
    deleteSingleNotification: builder.mutation({
      query: (id: string) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["notification"],
    }),
    deleteAllNotifications: builder.mutation({
      query: () => ({
        url: "/notifications",
        method: "DELETE",
      }),
      invalidatesTags: ["notification"],
    }),
  }),
});

export const {
  useGetAllNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useDeleteSingleNotificationMutation,
  useDeleteAllNotificationsMutation,
} = notificationApi;
