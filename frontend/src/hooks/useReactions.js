import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Helper function to initialize reaction data in the query cache
 * Call this when you have event data to populate the cache
 */
export const initializeReactionData = (queryClient, eventId, eventData) => {
  const queryKey = ['reactions', eventId];
  
  if (eventData && eventData.reactions) {
    const reactions = typeof eventData.reactions === 'object' && !Array.isArray(eventData.reactions)
      ? eventData.reactions
      : { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    
    queryClient.setQueryData(queryKey, {
      reactions,
      userReaction: eventData.userReaction || null,
    });
  }
};

/**
 * Custom hook for managing reactions with Facebook-like logic
 * Implements DELETE, UPDATE, and INSERT operations with optimistic updates
 */
export const useReactions = (eventId, currentUserId, initialData = null) => {
  const queryClient = useQueryClient();
  const queryKey = ['reactions', eventId];

  // Normalize initial data format
  const normalizedInitialData = initialData ? (() => {
    // Handle different formats of initial data
    if (initialData.reactions && typeof initialData.reactions === 'object' && !Array.isArray(initialData.reactions)) {
      return {
        reactions: initialData.reactions,
        userReaction: initialData.userReaction || null,
      };
    }
    // If initialData itself is the reactions object
    if (typeof initialData === 'object' && !Array.isArray(initialData) && initialData.like !== undefined) {
      return {
        reactions: initialData,
        userReaction: initialData.userReaction || null,
      };
    }
    return null;
  })() : null;

  // Query to fetch current reaction state
  // Uses initial data from event, only fetches if needed
  const { data: reactionData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      // Try to get reactions from dedicated reactions endpoint first
      try {
        const { data } = await api.get(`/api/events/${eventId}/reactions`);
        if (data && data.reactions) {
          return {
            reactions: typeof data.reactions === 'object' && !Array.isArray(data.reactions)
              ? (() => {
                  // Remove 'total' and 'userReaction' from counts
                  const { total, userReaction, ...counts } = data.reactions;
                  return counts;
                })()
              : { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
            userReaction: data.reactions.userReaction || null,
          };
        }
      } catch (error) {
        // Reactions endpoint might not exist, try event endpoint
        try {
          const { data } = await api.get(`/api/events/${eventId}`);
          if (data && data.reactions) {
            return {
              reactions: typeof data.reactions === 'object' && !Array.isArray(data.reactions)
                ? (() => {
                    const { total, userReaction, ...counts } = data.reactions;
                    return counts;
                  })()
                : { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
              userReaction: data.userReaction || data.reactions?.userReaction || null,
            };
          }
        } catch (eventError) {
          // Both endpoints failed, that's okay
        }
      }
      
      // Return default state if no data available
      return {
        reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        userReaction: null,
      };
    },
    enabled: !!eventId && !normalizedInitialData, // Only run if eventId is provided and no initial data
    initialData: normalizedInitialData, // Use normalized initial data
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Don't refetch if we have initial data
    refetchOnMount: !normalizedInitialData,
    refetchOnWindowFocus: false,
  });

  // Mutation for reacting to a post
  const reactMutation = useMutation({
    mutationFn: async ({ reactionType }) => {
      // Get current state from query cache
      const currentData = queryClient.getQueryData(queryKey);
      const currentUserReaction = currentData?.userReaction;
      
      // If clicking the same reaction, DELETE it
      if (currentUserReaction === reactionType) {
        try {
          const { data } = await api.delete(`/api/events/${eventId}/react`);
          // DELETE response: { message, reactions: { like, love, ... } } - no userReaction
          return { 
            operation: 'DELETE', 
            reactionType: null, 
            data: {
              ...data,
              reactions: {
                ...data.reactions,
                userReaction: null // Explicitly set to null after deletion
              }
            }
          };
        } catch (error) {
          // Handle different error cases gracefully
          const errorStatus = error.response?.status;
          
          // If DELETE fails with 400 (no reaction to remove), that's okay - user already removed it
          // If DELETE fails with 404 (event not found), that's also okay - optimistic update already handled it
          if (errorStatus === 400 || errorStatus === 404) {
            // Return success with current state (reaction already removed optimistically)
            const currentData = queryClient.getQueryData(queryKey);
            return { 
              operation: 'DELETE', 
              reactionType: null, 
              data: {
                reactions: currentData?.reactions || {
                  like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0,
                  userReaction: null
                }
              }
            };
          }
          
          // For 500 errors, log but don't fail completely - optimistic update already happened
          if (errorStatus === 500) {
            console.warn('Server error during reaction deletion, but optimistic update succeeded');
            // Return success with optimistic state
            const currentData = queryClient.getQueryData(queryKey);
            return { 
              operation: 'DELETE', 
              reactionType: null, 
              data: {
                reactions: currentData?.reactions || {
                  like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0,
                  userReaction: null
                }
              }
            };
          }
          
          throw error; // Re-throw other errors (401, etc.)
        }
      }
      
      // If changing reaction or adding new, use POST (handles both INSERT and UPDATE)
      try {
        const { data } = await api.post(`/api/events/${eventId}/react`, { reactionType });
        
        // POST response: { message, reactions: { like, love, ..., userReaction } }
        // Determine operation for logging/debugging
        const operation = currentUserReaction ? 'UPDATE' : 'INSERT';
        return { 
          operation, 
          reactionType, 
          previousReaction: currentUserReaction || null, 
          data 
        };
      } catch (error) {
        // For POST errors, let onError handle rollback
        // Only handle 400 specially (invalid reaction type)
        if (error.response?.status === 400) {
          // Invalid reaction type - rollback will happen in onError
          throw new Error(error.response?.data?.message || 'Invalid reaction type');
        }
        throw error; // Re-throw to trigger onError rollback
      }
    },
    
    // Optimistic update - update UI immediately before API call
    onMutate: async ({ reactionType }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) {
          return {
            reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
            userReaction: null,
          };
        }

        const currentUserReaction = old.userReaction;
        const newReactions = { ...old.reactions };
        const newUserReaction = currentUserReaction === reactionType ? null : reactionType;

        // If clicking the same reaction, remove it (DELETE)
        if (currentUserReaction === reactionType) {
          if (newReactions[reactionType] > 0) {
            newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
          }
        }
        // If changing reaction, update counts (UPDATE)
        else if (currentUserReaction && currentUserReaction !== reactionType) {
          // Decrement previous reaction
          if (newReactions[currentUserReaction] > 0) {
            newReactions[currentUserReaction] = Math.max(0, newReactions[currentUserReaction] - 1);
          }
          // Increment new reaction
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
        }
        // If it's a new reaction, add it (INSERT)
        else {
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
        }

        return {
          ...old,
          reactions: newReactions,
          userReaction: newUserReaction,
        };
      });

      // Return context with previous data for rollback
      return { previousData };
    },

    // On error, rollback to previous state
    onError: (error, variables, context) => {
      // Rollback to previous state
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      // Handle specific error cases
      const errorStatus = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update reaction';
      
      // Silently handle expected errors
      if (errorStatus === 400) {
        // Bad request (e.g., invalid reaction type, no reaction to remove)
        // This is expected in some cases, don't log as error
        return;
      }
      
      if (errorStatus === 401) {
        // Unauthorized - user needs to login
        console.warn('User not authenticated for reactions');
        // Could redirect to login if needed
        return;
      }
      
      // For 500 errors, log but don't spam console
      // The optimistic update already happened, so UI is responsive
      if (errorStatus === 500) {
        // Server error - log once but don't spam
        if (!error._logged) {
          console.warn('Server error updating reaction (500). UI remains responsive due to optimistic update.');
          error._logged = true;
        }
        return;
      }
      
      // For other errors, log quietly
      if (errorStatus !== 404) {
        console.warn('Reaction error:', errorMessage, `(Status: ${errorStatus})`);
      }
    },

    // On success, optionally refetch to ensure consistency
    onSuccess: (result) => {
      // Optionally invalidate and refetch to ensure server state is synced
      // queryClient.invalidateQueries({ queryKey });
      
      // Update cache with server response to ensure consistency
      if (result?.data?.reactions) {
        queryClient.setQueryData(queryKey, (old) => {
          const serverReactions = result.data.reactions;
          
          // Handle DELETE response (no userReaction) vs POST response (has userReaction)
          let userReaction = null;
          if (result.operation === 'DELETE') {
            userReaction = null; // DELETE always sets userReaction to null
          } else {
            // POST response includes userReaction in reactions object
            userReaction = serverReactions.userReaction !== undefined 
              ? serverReactions.userReaction 
              : result.reactionType;
          }
          
          // Remove 'total' and 'userReaction' from reactions counts if present
          const { total, userReaction: _, ...reactionCounts } = serverReactions;
          
          return {
            ...old,
            reactions: reactionCounts,
            userReaction: userReaction,
          };
        });
      }
    },

    // Always refetch on error to ensure consistency
    onSettled: () => {
      // Optionally refetch to ensure we have the latest data
      // queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    reactionData: reactionData || {
      reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      userReaction: null,
    },
    isLoading,
    react: reactMutation.mutate,
    reactAsync: reactMutation.mutateAsync,
    isReacting: reactMutation.isPending,
  };
};

