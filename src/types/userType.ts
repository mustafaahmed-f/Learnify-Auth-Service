export type ClerkUser = {
  clerkId: string;

  userMetadata: {
    role: string;
    dbUserId: string;
  };

  email?: string;
  firstName?: string;
  lastName?: string;
  imageURL?: string;
};
