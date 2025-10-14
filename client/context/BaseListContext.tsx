import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  BASES,
  CURRENT_USER,
  LISTINGS as LISTING_SEED,
} from "@/data/mock";
import type { Base, Listing, UserProfile } from "@/types";

type BaseListContextValue = {
  bases: Base[];
  currentBaseId: string;
  currentBase: Base;
  setCurrentBaseId: (baseId: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  clearSearch: () => void;
  user: UserProfile;
  isVerified: boolean;
  isModerator: boolean;
  listings: Listing[];
  addListing: (listing: Listing) => void;
  markListingSold: (listingId: string) => void;
  removeListing: (listingId: string) => void;
};

const BaseListContext = createContext<BaseListContextValue | undefined>(
  undefined,
);

export const BaseListProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const [currentBaseId, setCurrentBaseIdState] = useState<string>(
    CURRENT_USER.currentBaseId,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);
  const [listings, setListings] = useState<Listing[]>(() => {
    return [...LISTING_SEED].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  });

  const setCurrentBaseId = useCallback((baseId: string) => {
    setCurrentBaseIdState(baseId);
    setUser((prev) => ({ ...prev, currentBaseId: baseId }));
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const addListing = useCallback((listing: Listing) => {
    setListings((prev) => {
      const next = [listing, ...prev];
      next.sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      );
      return next;
    });
  }, []);

  const markListingSold = useCallback((listingId: string) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              status: "sold",
            }
          : listing,
      ),
    );
  }, []);

  const removeListing = useCallback((listingId: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== listingId));
  }, []);

  const currentBase = useMemo<Base>(() => {
    return (
      BASES.find((base) => base.id === currentBaseId) ??
      BASES.find((base) => base.id === CURRENT_USER.currentBaseId) ??
      BASES[0]
    );
  }, [currentBaseId]);

  const contextValue = useMemo<BaseListContextValue>(
    () => ({
      bases: BASES,
      currentBaseId,
      currentBase,
      setCurrentBaseId,
      searchQuery,
      setSearchQuery,
      clearSearch,
      user,
      isVerified: user.verificationStatus === "Verified",
      isModerator: user.role !== "member",
      listings,
      addListing,
      markListingSold,
      removeListing,
    }),
    [
      addListing,
      clearSearch,
      currentBase,
      currentBaseId,
      listings,
      markListingSold,
      removeListing,
      searchQuery,
      setCurrentBaseId,
      user,
    ],
  );

  return (
    <BaseListContext.Provider value={contextValue}>
      {children}
    </BaseListContext.Provider>
  );
};

export const useBaseList = (): BaseListContextValue => {
  const context = useContext(BaseListContext);

  if (!context) {
    throw new Error("useBaseList must be used within BaseListProvider");
  }

  return context;
};
