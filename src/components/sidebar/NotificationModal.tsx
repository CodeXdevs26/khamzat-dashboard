"use client";

import { useEffect, useState } from "react";
import { Bell, BookOpen, CheckCheck, Layers, ShieldCheck, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useDeleteAllNotificationsMutation,
  useDeleteSingleNotificationMutation,
  useGetAllNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
} from "@/redux/api/notificationApi";
import handleMutation from "@/utils/handleMutation";
import { cn } from "@/lib/utils";

type NotificationModelType = "Auth" | "Level" | "Chapter";

type TNotification = {
  id: string;
  message: string;
  description?: string;
  modelType: NotificationModelType;
  referenceId?: string;
  read: boolean;
  createdAt: string;
};

const typeIcon: Record<NotificationModelType, LucideIcon> = {
  Auth: ShieldCheck,
  Level: Layers,
  Chapter: BookOpen,
};

const PAGE_SIZE = 10;

const NotificationModal = () => {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  // Always fetch unread count for the badge (limit 1 is enough, meta carries it)
  const { data, isFetching } = useGetAllNotificationsQuery({
    page: 1,
    limit,
    sortBy: "createdAt",
    orderBy: "desc",
    ...(unreadOnly ? { read: false } : {}),
  });

  const [markAllRead, { isLoading: marking }] =
    useMarkAllNotificationsAsReadMutation();
  const [deleteOne] = useDeleteSingleNotificationMutation();
  const [deleteAll] = useDeleteAllNotificationsMutation();

  const notifications: TNotification[] = data?.data?.notifications ?? [];
  const meta = data?.data?.meta;
  const unreadCount = meta?.unreadCount ?? 0;
  const hasMore = meta ? notifications.length < meta.total : false;

  // Infinite scroll: when the sentinel at the bottom becomes visible, load the next page
  useEffect(() => {
    if (!sentinel || !scroller || isFetching) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setLimit((l) => l + PAGE_SIZE);
      },
      { root: scroller, rootMargin: "100px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // notifications.length: re-arm after each page so a still-visible sentinel loads again
  }, [sentinel, scroller, isFetching, notifications.length]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLimit(PAGE_SIZE);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className="bg-secondary p-2 py-[6px] rounded-full flex items-center gap-2 cursor-pointer"
        >
          <Bell size={28} className="ml-1 text-primary" />
          <p className="bg-primary/10 flex items-center justify-center text-primary rounded-full w-[33px] h-[33px]">
            {unreadCount}
          </p>
        </button>
      </DialogTrigger>

      <DialogContent
        className="top-[68px] right-4 left-auto translate-x-0 translate-y-0 sm:max-w-2xl max-h-[calc(100vh-90px)] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={unreadOnly ? "outline" : "default"}
              onClick={() => setUnreadOnly(false)}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={unreadOnly ? "default" : "outline"}
              onClick={() => setUnreadOnly(true)}
            >
              Unread
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={marking || unreadCount === 0}
              onClick={() =>
                handleMutation(undefined, markAllRead, "Marking all as read...")
              }
            >
              <CheckCheck size={16} /> Mark all read
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta?.total}
              onClick={() =>
                handleMutation(undefined, deleteAll, "Clearing notifications...")
              }
            >
              <Trash2 size={16} /> Clear all
            </Button>
          </div>
        </div>

        <div ref={setScroller} className="space-y-3 overflow-y-auto pr-1">
          {notifications.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No notifications
            </p>
          )}

          {notifications.map((n) => {
            const Icon = typeIcon[n.modelType] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start justify-between gap-3 p-4 rounded-lg border border-border",
                  !n.read && "bg-primary/5",
                )}
              >
                <div className="flex gap-3">
                  <div className="h-[44px] w-[44px] shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-medium flex items-center gap-2">
                      {n.message}
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </p>
                    {n.description && (
                      <p className="text-sm">{n.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete notification"
                  onClick={() =>
                    handleMutation(n.id, deleteOne, "Deleting notification...")
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          })}

          {hasMore && (
            <div
              ref={setSentinel}
              className="py-3 text-center text-sm text-muted-foreground"
            >
              Loading more...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
