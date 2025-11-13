import React, { useState, useMemo, memo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

// Memoized CommentItem to prevent unnecessary re-renders
const CommentItem = memo(({ comment, currentUser, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editText.trim() && editText !== comment.text) {
      onEdit(comment._id, editText);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-start space-x-2 group">
      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
        {comment.user?.profileImage ? (
          <img 
            src={comment.user.profileImage} 
            alt={comment.user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-xs">
            {comment.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="bg-gray-100 rounded-lg p-2 text-sm">
          <div className="font-medium text-gray-800">
            {comment.user?._id === currentUser?._id ? 'You' : comment.user?.name || 'Unknown User'}
          </div>
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-1">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-1 border rounded"
                autoFocus
              />
              <div className="flex space-x-2 mt-1">
                <button 
                  type="submit" 
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="text-gray-700">{comment.text}</div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </div>
        </div>
        {currentUser?._id === comment.user?._id && !isEditing && (
          <div className="flex space-x-2 text-xs mt-1">
            <button 
              onClick={() => setIsEditing(true)}
              className="text-gray-500 hover:text-blue-600"
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(comment._id)}
              className="text-gray-500 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

const CommentSection = memo(({
  eventId,
  comments = [],
  currentUser,
  onAddComment,
  onDeleteComment,
  onEditComment
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Memoize and sort comments to prevent unnecessary re-renders
  const { sortedComments, hasMore } = useMemo(() => {
    const validComments = (Array.isArray(comments) ? comments : [])
      .filter(comment => comment && comment._id && comment.text && comment.user);
      
    return {
      // Sort comments: newest first (most recent at top)
      sortedComments: [...validComments].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Newest first
      }),
      hasMore: validComments.length > 2
    };
  }, [comments]);
  
  // Determine which comments to display based on showAll state
  const displayedComments = showAllComments 
    ? sortedComments 
    : sortedComments.slice(0, 2);

  // Handle submission - not using useCallback since it depends on frequently changing state
  const handleSubmit = async (e) => {
    // Aggressively prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      if (e.nativeEvent) {
        e.nativeEvent.preventDefault();
        e.nativeEvent.stopPropagation();
        if (typeof e.nativeEvent.stopImmediatePropagation === 'function') {
          e.nativeEvent.stopImmediatePropagation();
        }
      }
    }
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    const commentText = newComment.trim();
    if (!commentText) {
      return;
    }
    
    // Clear input immediately for better UX
    const textToSubmit = commentText;
    setNewComment('');
    setIsSubmitting(true);
    
    try {
      const success = await onAddComment(eventId, textToSubmit);
      if (success) {
        setShowAllComments(true);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Restore input on error
      setNewComment(textToSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle button click separately to ensure preventDefault
  const handlePostClick = (e) => {
    // Aggressively prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      if (e.nativeEvent) {
        e.nativeEvent.preventDefault();
        e.nativeEvent.stopPropagation();
        if (typeof e.nativeEvent.stopImmediatePropagation === 'function') {
          e.nativeEvent.stopImmediatePropagation();
        }
      }
    }
    handleSubmit(e);
  };
  
  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      if (e.nativeEvent) {
        e.nativeEvent.preventDefault();
        e.nativeEvent.stopPropagation();
      }
      handleSubmit(e);
    }
  };

  const handleDelete = useCallback((commentId) => {
    onDeleteComment(commentId);
  }, [onDeleteComment]);

  const handleEdit = useCallback((commentId, newText) => {
    return onEditComment(commentId, newText);
  }, [onEditComment]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim() || !editingCommentId) return;
    
    const success = await handleEdit(editingCommentId, editText);
    if (success) {
      setEditingCommentId(null);
      setEditText('');
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {displayedComments.length > 0 ? (
          <>
            {displayedComments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                currentUser={currentUser}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
            
            {/* View all / Show less buttons */}
            {hasMore && (
              <button 
                type="button"
                onClick={() => setShowAllComments(!showAllComments)}
                className={`text-sm ${showAllComments ? 'text-gray-500 hover:text-gray-700' : 'text-blue-600 hover:text-blue-800'} font-medium w-full text-left py-1`}
              >
                {showAllComments ? 'Show less' : `View all ${sortedComments.length} comments`}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-center text-gray-500 py-2">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>

      {/* Add Comment Form - Using div instead of form to prevent any form submission */}
      <div 
        className="flex items-start space-x-2 mt-3"
        onKeyDown={handleKeyDown}
      >
        <div className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') {
                  e.stopImmediatePropagation();
                }
              }
            }}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={handlePostClick}
          disabled={!newComment.trim() || isSubmitting}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
});

CommentSection.displayName = 'CommentSection';

export default CommentSection;
