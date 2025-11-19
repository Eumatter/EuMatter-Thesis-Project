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
      // Try to get reactions from event endpoint if available
      try {
        const { data } = await api.get(`/api/events/${eventId}`);
        if (data && data.reactions) {
          return {
            reactions: typeof data.reactions === 'object' && !Array.isArray(data.reactions)
              ? data.reactions
              : { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
            userReaction: data.userReaction || null,
          };
        }
      } catch (error) {
        // Endpoint might not exist, that's okay
      }
      
      // Return default state if no data available
      return {
        reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        userReaction: null,
      };
    },
    enabled: !!eventId, // Only run if eventId is provided
    initialData: normalizedInitialData, // Use normalized initial data
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Don't refetch if we have initial data and it's fresh
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
        const { data } = await api.delete(`/api/events/${eventId}/react`);
        return { operation: 'DELETE', reactionType: null, data };
      }
      
      // If changing reaction, UPDATE it (POST handles both INSERT and UPDATE)
      // The backend should handle the logic of whether to INSERT or UPDATE
      const { data } = await api.post(`/api/events/${eventId}/react`, { reactionType });
      
      // Determine operation for logging/debugging
      const operation = currentUserReaction ? 'UPDATE' : 'INSERT';
      return { 
        operation, 
        reactionType, 
        previousReaction: currentUserReaction || null, 
        data 
      };
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
      
      console.error('Error reacting to event:', error);
      // You can add toast notification here if needed
    },

    // On success, optionally refetch to ensure consistency
    onSuccess: (result) => {
      // Optionally invalidate and refetch to ensure server state is synced
      // queryClient.invalidateQueries({ queryKey });
      
      // Or update with server response if it's different
      if (result?.data?.reactions) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          reactions: result.data.reactions,
          userReaction: result.data.userReaction || null,
        }));
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

