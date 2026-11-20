"use client";
import Image from "next/image";
import avatarImg from "@/assets/avatar.png";
import Link from "next/link";
import { useGetProfileQuery } from "@/redux/api/profileApi";

const ProfileDropdown = () => {
  const { data } = useGetProfileQuery(undefined);
  const profile = data?.data;

  return (
    <Link href="/dashboard/profile" aria-label="Go to profile">
      <Image
        src={profile?.image || avatarImg}
        alt="profile"
        width={40}
        height={40}
        className="rounded-full"
      />
    </Link>
  );
};

export default ProfileDropdown;
