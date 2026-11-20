"use client";
import ASpinner from "@/components/ui/ASpinner";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { UserCard } from "../../user-management/_components/UserCard";

const NewUsers = () => {
  const { data, isLoading } = useGetUsersQuery({ page: 1, limit: 4 });
  const users = data?.data?.auths || [];

  return (
    <div className="mt-6">
      <h3 className="font-bold text-2xl">New Users</h3>
      <div className="space-y-3 mt-4">
        {isLoading ? (
          <ASpinner size={60} />
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">No users yet</p>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          users.map((user: any) => <UserCard key={user.id} user={user} />)
        )}
      </div>
    </div>
  );
};

export default NewUsers;
