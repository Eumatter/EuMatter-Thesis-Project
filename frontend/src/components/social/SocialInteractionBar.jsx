import React, { useState, useRef, useEffect } from 'react';
import { FaThumbsUp, FaRegThumbsUp, FaHeart, FaRegHeart, FaLaugh, FaRegLaugh, FaSadTear, FaRegSadTear, FaAngry, FaRegAngry, FaSurprise, FaRegSurprise, FaComment, FaRegComment, FaShare, FaRegShareAlt, FaDonate, FaRegDonate } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import ShareButton from './ShareButton';
import Comments from './Comments';
import DonateButton from './DonateButton';

const reactionIcons = {
  like: { icon: <FaThumbsUp className="text-blue-500" />, iconOutline: <FaRegThumbsUp />, label: 'Like' },
  love: { icon: <FaHeart className="text-red-500" />, iconOutline: <FaRegHeart />, label: 'Love' },
  haha: { icon: <FaLaugh className="text-yellow-500" />, iconOutline: <FaRegLaugh />, label: 'Haha' },
  wow: { icon: <FaSurprise className="text-yellow-400" />, iconOutline: <FaRegSurprise />, label: 'Wow' },
  sad: { icon: <FaSadTear className="text-yellow-600" />, iconOutline: <FaRegSadTear />, label: 'Sad' },
  angry: { icon: <FaAngry className="text-red-700" />, iconOutline: <FaRegAngry />, label: 'Angry' },
};

const SocialInteractionBar = ({ event, onReact, onComment, onDonate, className = '' }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [isHoveringReaction, setIsHoveringReaction] = useState(null);
  const barRef = useRef(null);
  const reactionsRef = useRef(null);

  // Close reactions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = (reactionType) => {
    const newReaction = userReaction === reactionType ? null : reactionType;
    setUserReaction(newReaction);
    setShowReactions(false);
    if (onReact) onReact(event._id, newReaction);
  };

  const toggleComments = () => {
    setActiveTab(activeTab === 'comments' ? null : 'comments');
  };

  const toggleDonate = () => {
    setActiveTab(activeTab === 'donate' ? null : 'donate');
  };

  // Calculate total reactions
  const totalReactions = event.reactions 
    ? Object.values(event.reactions).reduce((sum, users) => sum + (users?.length || 0), 0)
    : 0;

  const interactionButtons = [
    {
      id: 'like',
      icon: userReaction ? reactionIcons[userReaction]?.icon : <FaRegThumbsUp />,
      activeIcon: <FaThumbsUp className="text-blue-500" />,
      label: userReaction ? reactionIcons[userReaction]?.label : 'Like',
      isActive: !!userReaction,
      onClick: () => handleReaction('like'),
      onMouseEnter: () => {},
      onMouseLeave: () => {},
      className: 'relative group',
      count: totalReactions,
    },
    {
      id: 'comment',
      icon: <FaRegComment />,
      activeIcon: <FaComment className="text-blue-500" />,
      label: 'Comment',
      isActive: activeTab === 'comments',
      onClick: toggleComments,
      count: event.comments?.length || 0,
    },
    {
      id: 'share',
      icon: <FaRegShareAlt />,
      activeIcon: <FaShare className="text-blue-500" />,
      label: 'Share',
      isActive: false,
      component: <ShareButton event={event} />,
    },
    {
      id: 'donate',
      icon: <FaRegDonate />,
      activeIcon: <FaDonate className="text-green-500" />,
      label: 'Donate',
      isActive: activeTab === 'donate',
      onClick: toggleDonate,
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Main Interaction Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center space-x-1 flex-1">
          {interactionButtons.map((button) => (
            <div key={button.id} className="relative flex-1">
              {button.component ? (
                <div className="flex justify-center">
                  {button.component}
                </div>
              ) : (
                <button
                  onClick={button.onClick}
                  onMouseEnter={() => button.onMouseEnter?.()}
                  onMouseLeave={() => button.onMouseLeave?.()}
                  className={`flex items-center justify-center w-full py-2 px-1 rounded-md transition-all duration-200 ${
                    button.isActive 
                      ? 'text-blue-500 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                  data-tooltip-id={`tooltip-${button.id}`}
                  data-tooltip-content={button.label}
                >
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {button.isActive ? button.activeIcon : button.icon}
                      {button.id === 'like' && showReactions && (
                        <div 
                          ref={reactionsRef}
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 flex space-x-1 bg-white rounded-full shadow-lg p-1 border border-gray-200"
                          onMouseEnter={() => setShowReactions(true)}
                          onMouseLeave={() => setShowReactions(false)}
                        >
                          {Object.entries(reactionIcons).map(([type, { icon, label }]) => (
                            <motion.button
                              key={type}
                              whileHover={{ scale: 1.2, y: -5 }}
                              whileTap={{ scale: 0.9 }}
                              className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-200 ${
                                userReaction === type ? 'bg-blue-50' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(type);
                              }}
                              data-tooltip-id={`tooltip-${type}`}
                              data-tooltip-content={label}
                            >
                              {icon}
                              <Tooltip id={`tooltip-${type}`} />
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs mt-1">{button.label}</span>
                    {(button.count > 0 || button.isActive) && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {button.count}
                      </span>
                    )}
                  </div>
                  <Tooltip id={`tooltip-${button.id}`} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {activeTab === 'comments' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-100">
              <Comments 
                eventId={event._id} 
                initialComments={event.comments || []} 
                onComment={onComment} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donate Section */}
      <AnimatePresence>
        {activeTab === 'donate' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-100">
              <DonateButton 
                eventId={event._id}
                onDonate={onDonate}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialInteractionBar;
