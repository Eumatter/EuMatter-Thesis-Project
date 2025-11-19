import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'react-tooltip';

// Emoji reactions with colors
const reactionEmojis = {
  like: { emoji: '👍', label: 'Like', color: '#3B82F6', bgColor: 'bg-blue-50', hoverBg: 'hover:bg-blue-100' },
  love: { emoji: '❤️', label: 'Love', color: '#EF4444', bgColor: 'bg-red-50', hoverBg: 'hover:bg-red-100' },
  haha: { emoji: '😂', label: 'Haha', color: '#F59E0B', bgColor: 'bg-yellow-50', hoverBg: 'hover:bg-yellow-100' },
  wow: { emoji: '😮', label: 'Wow', color: '#FBBF24', bgColor: 'bg-amber-50', hoverBg: 'hover:bg-amber-100' },
  sad: { emoji: '😢', label: 'Sad', color: '#F59E0B', bgColor: 'bg-orange-50', hoverBg: 'hover:bg-orange-100' },
  angry: { emoji: '😠', label: 'Angry', color: '#DC2626', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-200' },
};

const Reactions = ({ eventId, initialReactions = {}, onReact, currentUserId }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const [animatingReaction, setAnimatingReaction] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [userReaction, setUserReaction] = useState(null);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const touchStartTimeRef = useRef(0);

  // Process reactions data - handle both formats (arrays or counts)
  useEffect(() => {
    if (!initialReactions) {
      setReactionCounts({ like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
      setUserReaction(null);
      return;
    }

    // Check if reactions is already in count format (has userReaction property or numeric values)
    const hasUserReaction = initialReactions.userReaction !== undefined;
    const hasCounts = typeof initialReactions.like === 'number';

    if (hasCounts || hasUserReaction) {
      // Already in count format
      setReactionCounts({
        like: initialReactions.like || 0,
        love: initialReactions.love || 0,
        haha: initialReactions.haha || 0,
        wow: initialReactions.wow || 0,
        sad: initialReactions.sad || 0,
        angry: initialReactions.angry || 0,
      });
      setUserReaction(initialReactions.userReaction || null);
    } else {
      // Convert array format to counts
      const counts = {};
      let userReact = null;

      Object.keys(reactionEmojis).forEach(type => {
        const reactionArray = initialReactions[type];
        if (Array.isArray(reactionArray)) {
          counts[type] = reactionArray.length;
          // Check if current user has reacted
          if (currentUserId && reactionArray.some(id => {
            const idStr = typeof id === 'object' ? id.toString() : id;
            return idStr === currentUserId.toString();
          })) {
            userReact = type;
          }
        } else {
          counts[type] = 0;
        }
      });

      setReactionCounts(counts);
      setUserReaction(userReact);
    }
  }, [initialReactions, currentUserId]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    const handleTouchOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleTouchOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleTouchOutside);
      };
    }
  }, [showPicker]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleReaction = async (reactionType) => {
    // If clicking the same reaction, remove it
    const newReaction = userReaction === reactionType ? null : reactionType;
    const previousReaction = userReaction;
    
    // Store previous counts for rollback
    const previousCounts = { ...reactionCounts };
    
    // Optimistic update - update counts immediately
    setReactionCounts(prev => {
      const newCounts = { ...prev };
      
      // Remove previous reaction count
      if (previousReaction && newCounts[previousReaction] > 0) {
        newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
      }
      
      // Add new reaction count (if not removing)
      if (newReaction) {
        // Only increment if we're adding a new reaction (not just switching)
        if (!previousReaction || previousReaction !== newReaction) {
          newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
        }
      }
      
      return newCounts;
    });
    
    setUserReaction(newReaction);
    setShowPicker(false);
    setAnimatingReaction(reactionType);
    
    // Reset animation after a short delay
    setTimeout(() => setAnimatingReaction(null), 600);

    // Call the parent handler
    if (onReact) {
      const result = await onReact(eventId, newReaction || reactionType);
      
      // If the API call failed, revert the optimistic update
      if (result === false) {
        setReactionCounts(previousCounts);
        setUserReaction(previousReaction);
      }
    }
  };

  // Calculate total reactions
  const totalReactions = Object.keys(reactionEmojis).reduce((sum, type) => {
    return sum + (reactionCounts[type] || 0);
  }, 0);

  // Get the main reaction button display
  const getMainReactionDisplay = () => {
    if (userReaction && reactionEmojis[userReaction]) {
      const reaction = reactionEmojis[userReaction];
      return (
        <div className="flex items-center space-x-1.5">
          <span 
            className={`text-lg transition-all duration-300 ${
              animatingReaction === userReaction ? 'animate-bounce scale-125' : ''
            }`}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          >
            {reaction.emoji}
          </span>
          <span className="text-xs font-medium text-gray-600">{reaction.label}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-1.5">
        <span className="text-lg">👍</span>
        <span className="text-xs font-medium text-gray-600">Like</span>
      </div>
    );
  };

  return (
    <div className="relative flex items-center">
      {/* Main Reaction Button */}
        <button 
        ref={buttonRef}
        className={`
          flex items-center justify-center px-4 py-2 rounded-full 
          transition-all duration-300 
          ${userReaction 
            ? `${reactionEmojis[userReaction]?.bgColor || 'bg-blue-50'} border-2 shadow-sm ${reactionEmojis[userReaction]?.hoverBg || 'hover:bg-blue-100'}` 
            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
          }
          transform hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1
          font-medium
        `}
        style={{
          borderColor: userReaction ? reactionEmojis[userReaction]?.color : 'transparent',
        }}
          onMouseEnter={() => setShowPicker(true)}
        onMouseLeave={() => {
          // Keep picker open if hovering over it
          setTimeout(() => {
            if (!pickerRef.current?.matches(':hover')) {
              setShowPicker(false);
            }
          }, 200);
        }}
        onTouchStart={(e) => {
          touchStartTimeRef.current = Date.now();
          isLongPressRef.current = false;
          
          longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setShowPicker(true);
            // Haptic feedback on mobile devices
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }, 500); // 500ms for long press
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearTimeout(longPressTimerRef.current);
          
          if (!isLongPressRef.current) {
            // Quick tap - toggle like or remove reaction
            if (!userReaction) {
              handleReaction('like');
            } else {
              // If already reacted, toggle it off
              handleReaction(userReaction);
            }
          }
          isLongPressRef.current = false;
        }}
        onTouchCancel={(e) => {
          clearTimeout(longPressTimerRef.current);
          isLongPressRef.current = false;
        }}
        onClick={(e) => {
          // Desktop behavior only (ignore on touch devices)
          if (!('ontouchstart' in window)) {
            e.preventDefault();
            e.stopPropagation();
            
            // Quick click: if no reaction, add like; if has reaction, toggle it off
            if (!userReaction) {
              handleReaction('like');
            } else {
              // If already reacted with the displayed reaction, toggle it off
              handleReaction(userReaction);
            }
          }
        }}
      >
        {getMainReactionDisplay()}
        </button>
        
      {/* Reaction Count Badge */}
        {totalReactions > 0 && (
        <div className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
            {totalReactions}
        </div>
        )}

      {/* Reaction Picker Popup */}
      {showPicker && (
        <div 
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-3 bg-white rounded-full shadow-2xl border border-gray-200 p-2.5 flex items-center space-x-1.5 z-50 animate-fade-in"
          style={{
            animation: 'reaction-slide-up 0.2s ease-out',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
        >
          {Object.entries(reactionEmojis).map(([type, reaction]) => {
            const isSelected = userReaction === type;
            const isHovered = hoveredReaction === type;
            const count = reactionCounts[type] || 0;
            
            return (
              <div key={type} className="relative">
            <button
              data-tooltip-id={`reaction-${eventId}-${type}`}
                  data-tooltip-content={`${reaction.label}${count > 0 ? ` (${count})` : ''}`}
                  className={`
                    relative w-11 h-11 flex items-center justify-center rounded-full
                    transition-all duration-300 transform cursor-pointer
                    ${isSelected 
                      ? `${reaction.bgColor} scale-110 border-2 shadow-md` 
                      : 'bg-white hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }
                    ${isHovered ? 'scale-125 -translate-y-3 z-10' : 'hover:scale-110 hover:-translate-y-1.5'}
                    focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1
                    ${animatingReaction === type ? 'animate-bounce' : ''}
                    active:scale-95
                  `}
                  style={{
                    borderColor: isSelected ? reaction.color : 'transparent',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  onMouseEnter={() => setHoveredReaction(type)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReaction(type);
                  }}
                >
                  <span 
                    className="text-2xl transition-all duration-300 select-none pointer-events-none"
                    style={{
                      transform: isHovered ? 'scale(1.35) rotate(8deg)' : isSelected ? 'scale(1.1)' : 'scale(1)',
                      filter: isSelected 
                        ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.25))' 
                        : isHovered 
                        ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' 
                        : 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    {reaction.emoji}
                  </span>
                  
                  {/* Animated glow effect on hover */}
                  {isHovered && (
                    <span 
                      className="absolute inset-0 rounded-full opacity-30"
                      style={{ 
                        backgroundColor: reaction.color,
                        animation: 'reaction-pulse 1s ease-in-out infinite',
                        filter: 'blur(8px)',
                        transform: 'scale(1.3)',
                      }}
                    />
                  )}
                  
                  {/* Selected indicator ring */}
                  {isSelected && (
                    <span 
                      className="absolute inset-0 rounded-full"
                      style={{ 
                        border: `2px solid ${reaction.color}`,
                        boxShadow: `0 0 0 2px ${reaction.color}20`,
                        animation: 'reaction-pulse 2s ease-in-out infinite',
                      }}
                    />
                  )}
                </button>
              <Tooltip id={`reaction-${eventId}-${type}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Reaction Counts (Optional - shows breakdown) */}
      {totalReactions > 0 && Object.keys(reactionEmojis).some(type => reactionCounts[type] > 0) && (
        <div className="ml-2 flex items-center space-x-1">
          {Object.entries(reactionEmojis)
            .filter(([type]) => reactionCounts[type] > 0)
            .slice(0, 3) // Show max 3 reactions
            .map(([type, reaction]) => (
              <div
                key={type}
                className="flex items-center space-x-0.5 text-xs"
                title={`${reaction.label}: ${reactionCounts[type]}`}
              >
                <span className="text-sm">{reaction.emoji}</span>
                {reactionCounts[type] > 1 && (
                  <span className="text-gray-600 font-medium">{reactionCounts[type]}</span>
                )}
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reactions;
