"use client";
import { SidebarTrigger } from "../ui/sidebar";
import NotificationModal from "./NotificationModal";
import ProfileDropdown from "@/app/(generalLayout)/sections/dashboard/ProfileDropdown";
import { useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { selectUser } from "@/redux/slice/authSlice";
import { baseApi } from "@/redux/api/baseApi";

type NotificationEvent = {
  message: string;
};

const Header = () => {
  const tokenUser = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  const socket = useSocket();
  useEffect(() => {
    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }

      // Listen for real-time notification event
      socket.on(
        `notification::${tokenUser?._id}`,
        (newNotification: NotificationEvent) => {
        toast.info(newNotification.message, {
          duration: 4000,
        });
        dispatch(baseApi.util.invalidateTags(["notification"]));
        },
      );

      socket.on("connect", () => {
        console.log("Socket connected");
      });
      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      return () => {
        socket.off(`notification::${tokenUser?._id}`);
        socket.off("connect");
        socket.off("disconnect");
        // Do not disconnect socket here to maintain connection across components
      };
    }
  }, [dispatch, socket, tokenUser?._id]);
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 right-0 z-50 bg-sidebar">
      <div className="flex items-center justify-between gap-2 px-4 w-full">
        <SidebarTrigger className="-ml-1 !text-foreground hover:!text-sidebar" />
        <div className="flex items-center gap-3">
          <NotificationModal />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
