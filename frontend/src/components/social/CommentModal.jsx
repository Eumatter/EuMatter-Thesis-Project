import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FaTimes, FaEdit, FaTrash, FaPaperPlane, FaUser, FaEllipsisV } from 'react-icons/fa';
import { toast } from 'react-toastify';
import LoadingSpinner from '../LoadingSpinner';

// Memoized CommentItem component
const CommentItem = React.memo(({ comment, currentUser, onDelete, onEdit, recentlyEditedComments, setRecentlyEditedComments }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);
    const [showMenu, setShowMenu] = useState(false);
    const [showEdited, setShowEdited] = useState(false);
    const editInputRef = useRef(null);
    const menuRef = useRef(null);
    const editTimeoutRef = useRef(null);

    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [isEditing]);

    // Check if this comment was recently edited
    useEffect(() => {
        const wasRecentlyEdited = recentlyEditedComments?.includes(comment._id);
        
        // Clear any existing timeout
        if (editTimeoutRef.current) {
            clearTimeout(editTimeoutRef.current);
            editTimeoutRef.current = null;
        }
        
        if (wasRecentlyEdited) {
            setShowEdited(true);
            
            // Hide "edited" after 10 seconds
            editTimeoutRef.current = setTimeout(() => {
                setShowEdited(false);
                // Remove from recently edited list
                if (setRecentlyEditedComments) {
                    setRecentlyEditedComments((prev) => prev.filter(id => id !== comment._id));
                }
            }, 10000);
        } else {
            setShowEdited(false);
        }
        
        return () => {
            if (editTimeoutRef.current) {
                clearTimeout(editTimeoutRef.current);
                editTimeoutRef.current = null;
            }
        };
    }, [comment._id, recentlyEditedComments, setRecentlyEditedComments]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (editText.trim() && editText !== comment.text) {
            const success = await onEdit(comment._id, editText);
            if (success) {
                setIsEditing(false);
                // Add to recently edited comments list (this will trigger useEffect to show "edited")
                if (setRecentlyEditedComments) {
                    setRecentlyEditedComments((prev) => {
                        if (!prev.includes(comment._id)) {
                            return [...prev, comment._id];
                        }
                        return prev;
                    });
                }
            }
        } else {
            setIsEditing(false);
            setEditText(comment.text);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditText(comment.text);
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    const isOwner = currentUser?._id === comment.user?._id;

    return (
        <div className="flex items-start space-x-3 group py-3 border-b border-gray-100 last:border-b-0 animate-fade-in relative">
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                {comment.user?.profileImage ? (
                    <img 
                        src={comment.user.profileImage} 
                        alt={comment.user.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#800000] text-white text-sm font-semibold">
                        {getInitials(comment.user?.name)}
                    </div>
                )}
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2.5 group-hover:bg-gray-100 transition-colors duration-200 relative">
                    {/* User Name and Menu Button Row */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-gray-900 text-sm">
                            {comment.user?._id === currentUser?._id ? 'You' : comment.user?.name || 'Unknown User'}
                        </div>
                        
                        {/* Three Dots Menu Button - Only show for comment owner */}
                        {isOwner && !isEditing && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-200 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1"
                                    aria-label="Comment options"
                                >
                                    <FaEllipsisV className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                {showMenu && (
                                    <div className="absolute right-0 top-8 z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                setIsEditing(true);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                                        >
                                            <FaEdit className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                if (window.confirm('Are you sure you want to delete this comment?')) {
                                                    onDelete(comment._id);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center space-x-2"
                                        >
                                            <FaTrash className="w-3.5 h-3.5" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Comment Text */}
                    {isEditing ? (
                        <form onSubmit={handleEditSubmit} className="mt-2">
                            <textarea
                                ref={editInputRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent resize-none"
                                rows="2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.shiftKey === false) {
                                        e.preventDefault();
                                        handleEditSubmit(e);
                                    }
                                    if (e.key === 'Escape') {
                                        handleCancel();
                                    }
                                }}
                            />
                            <div className="flex items-center space-x-2 mt-2">
                                <button 
                                    type="submit"
                                    className="px-3 py-1 text-xs font-medium text-white bg-[#800000] rounded-lg hover:bg-[#600000] transition-colors duration-200"
                                >
                                    Save
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words pr-8">
                                {comment.text}
                            </div>
                            <div className="flex items-center space-x-3 mt-2">
                                <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                                {showEdited && (
                                    <span className="text-xs text-gray-400 italic animate-fade-in">(edited)</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

CommentItem.displayName = 'CommentItem';

const CommentModal = ({ 
    isOpen, 
    onClose, 
    event, 
    comments = [], 
    currentUser, 
    onAddComment, 
    onDeleteComment, 
    onEditComment 
}) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [recentlyEditedComments, setRecentlyEditedComments] = useState([]);
    const commentInputRef = useRef(null);
    const modalContentRef = useRef(null);
    const commentsEndRef = useRef(null);

    // Sort comments: newest first
    const sortedComments = useMemo(() => {
        const validComments = (Array.isArray(comments) ? comments : [])
            .filter(comment => comment && comment._id && comment.text && comment.user);
        return [...validComments].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Newest first
        });
    }, [comments]);

    // Scroll to bottom when comments change or modal opens
    useEffect(() => {
        if (isOpen && commentsEndRef.current && sortedComments.length > 0) {
            const timeoutId = setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, sortedComments.length]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                commentInputRef.current?.focus();
            }, 300);
        } else {
            setNewComment('');
            // Clear recently edited comments when modal closes
            setRecentlyEditedComments([]);
        }
    }, [isOpen]);

    // Handle escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (isSubmitting || !newComment.trim()) {
            return false;
        }

        const commentText = newComment.trim();
        setNewComment('');
        setIsSubmitting(true);

        try {
            // Call the parent's add comment handler - this will update the events state
            const success = await onAddComment(event._id, commentText);
            
            if (success !== false) {
                // Comment was added successfully (optimistically or from server)
                // The modal will automatically update because comments prop will change
                // Scroll to bottom after a brief delay to allow DOM update
                setTimeout(() => {
                    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            } else {
                // Submission failed - restore comment text
                setNewComment(commentText);
                toast.error('Failed to post comment. Please try again.');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            setNewComment(commentText); // Restore comment on error
            toast.error('Failed to post comment. Please try again.');
        } finally {
            setIsSubmitting(false);
            // Keep input focused after posting so user can continue commenting
            setTimeout(() => {
                if (commentInputRef.current) {
                    commentInputRef.current.focus();
                }
            }, 200);
        }
        return false;
    };

    const handleDelete = useCallback(async (commentId) => {
        try {
            await onDeleteComment(commentId);
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    }, [onDeleteComment]);

    const handleEdit = useCallback(async (commentId, newText) => {
        try {
            return await onEditComment(commentId, newText);
        } catch (error) {
            console.error('Error editing comment:', error);
            return false;
        }
    }, [onEditComment]);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                ref={modalContentRef}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-gray-900">Comments</h2>
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                            {sortedComments.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        aria-label="Close modal"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Event Preview */}
                {event && (
                    <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-3">
                            {event.image && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    <img 
                                        src={`data:image/jpeg;base64,${event.image}`}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
                                <p className="text-xs text-gray-500 truncate">
                                    {event.organizer?.name || event.department?.name || 'Organizer'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {sortedComments.length > 0 ? (
                        <div className="space-y-1">
                            {sortedComments.map((comment) => (
                                <CommentItem
                                    key={comment._id}
                                    comment={comment}
                                    currentUser={currentUser}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    recentlyEditedComments={recentlyEditedComments}
                                    setRecentlyEditedComments={setRecentlyEditedComments}
                                />
                            ))}
                            <div ref={commentsEndRef} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <FaUser className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No comments yet</p>
                            <p className="text-sm text-gray-400 mt-1">Be the first to comment on this event!</p>
                        </div>
                    )}
                </div>

                {/* Add Comment Form */}
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-white rounded-b-2xl sticky bottom-0">
                    <div 
                        className="flex items-end space-x-3"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                                e.preventDefault();
                            }
                        }}
                    >
                        {/* Current User Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                            {currentUser?.profileImage ? (
                                <img 
                                    src={currentUser.profileImage} 
                                    alt={currentUser.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#800000] text-white text-sm font-semibold">
                                    {getInitials(currentUser?.name)}
                                </div>
                            )}
                        </div>

                        {/* Comment Input */}
                        <div className="flex-1 relative">
                            <textarea
                                ref={commentInputRef}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.shiftKey === false) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSubmit(e);
                                    }
                                }}
                                placeholder="Write a comment..."
                                rows="1"
                                className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent resize-none scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSubmit(e);
                                }}
                                disabled={!newComment.trim() || isSubmitting}
                                className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#800000] text-white hover:bg-[#600000] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 transform hover:scale-110 active:scale-95"
                                aria-label="Post comment"
                            >
                                {isSubmitting ? (
                                    <LoadingSpinner size="tiny" inline />
                                ) : (
                                    <FaPaperPlane className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Helper Text */}
                    <p className="text-xs text-gray-400 mt-2 ml-14">
                        Press Enter to post, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CommentModal;

