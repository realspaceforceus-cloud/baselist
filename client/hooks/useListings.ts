import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getListings,
  getListing,
  getUserListings,
  createListing,
  updateListing,
  deleteListing,
} from "@/lib/listingsApi";
import type { Listing, ListingWithSeller } from "@/types";

const LISTINGS_QUERY_KEY = ["listings"];
const LISTING_QUERY_KEY = ["listing"];
const USER_LISTINGS_QUERY_KEY = ["userListings"];

/**
 * Hook to fetch paginated marketplace listings
 */
export function useListings(options: {
  baseId?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [
      ...LISTINGS_QUERY_KEY,
      options.baseId,
      options.category,
      options.search,
      options.offset,
    ],
    queryFn: () => getListings(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch a single listing by ID
 */
export function useListing(id: string | null) {
  return useQuery({
    queryKey: [...LISTING_QUERY_KEY, id],
    queryFn: () => getListing(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Hook to fetch a user's listings
 */
export function useUserListings(
  userId: string | null,
  options?: { status?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [
      ...USER_LISTINGS_QUERY_KEY,
      userId,
      options?.status,
      options?.offset,
    ],
    queryFn: () => getUserListings(userId!, options),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Hook to create a new listing
 */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createListing,
    onSuccess: (newListing) => {
      // Invalidate listings queries to refetch
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_LISTINGS_QUERY_KEY });

      toast.success("Listing created successfully");
      return newListing;
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to create listing";
      toast.error(message);
    },
  });
}

/**
 * Hook to update a listing
 */
export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Listing> }) =>
      updateListing(id, data),
    onSuccess: (updatedListing) => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: LISTING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_LISTINGS_QUERY_KEY });

      toast.success("Listing updated successfully");
      return updatedListing;
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update listing";
      toast.error(message);
    },
  });
}

/**
 * Hook to delete a listing
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_LISTINGS_QUERY_KEY });

      toast.success("Listing deleted successfully");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to delete listing";
      toast.error(message);
    },
  });
}
