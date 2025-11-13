import React, { useState, useEffect, useRef } from 'react';
import { FaUserCircle, FaEllipsisH, FaTrash, FaEdit } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const Comment = ({ comment, currentUser, onDelete, onEdit }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const optionsRef = useRef(null);

  const handleClickOutside = (event) => {
    if (optionsRef.current && !optionsRef.current.contains(event.target)) {
      setShowOptions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveEdit = () => {
    onEdit(comment._id, editedText);
    setIsEditing(false);
  };

  return (
    <div className="flex items-start space-x-3 group">
      <div className="flex-shrink-0">
        {comment.user?.profileImage ? (
          <img 
            src={comment.user.profileImage} 
            alt={comment.user.name} 
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <FaUserCircle className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 rounded-2xl px-3 py-2 relative">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-900">
              {comment.user?.name || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          {isEditing ? (
            <div className="mt-1">
              <input
                type="text"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm"
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-1">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-800">{comment.text}</p>
          )}
        </div>
      </div>
      
      {currentUser?._id === comment.user?._id && (
        <div className="relative" ref={optionsRef}>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1"
          >
            <FaEllipsisH className="w-4 h-4" />
          </button>
          
          {showOptions && (
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <FaEdit className="mr-2" /> Edit
              </button>
              <button
                onClick={() => onDelete(comment._id)}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <FaTrash className="mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ eventId, comments = [], currentUser, onAddComment, onDeleteComment, onEditComment }) => {
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  
  const displayedComments = showAllComments ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3 && !showAllComments;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      setIsLoading(true);
      await onAddComment(eventId, commentText);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={!commentText.trim() || isLoading}
          className="px-4 py-1 text-sm font-medium text-white bg-blue-500 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Posting...' : 'Post'}
        </button>
      </form>

      {comments.length > 0 && (
        <div className="mt-2 space-y-3">
          {hasMoreComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-xs text-blue-500 hover:underline focus:outline-none"
            >
              View all {comments.length} comments
            </button>
          )}
          
          <div className="space-y-3">
            {displayedComments.map((comment) => (
              <Comment
                key={comment._id}
                comment={comment}
                currentUser={currentUser}
                onDelete={onDeleteComment}
                onEdit={onEditComment}
              />
            ))}
          </div>
          
          {showAllComments && comments.length > 3 && (
            <button
              onClick={() => setShowAllComments(false)}
              className="text-xs text-blue-500 hover:underline focus:outline-none"
            >
              Show fewer comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
