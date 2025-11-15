import React, { useState } from 'react';
import { FaShare, FaLink, FaFacebook, FaTwitter, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-toastify';

const ShareButton = ({ event }) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const shareUrl = `${window.location.origin}/events/${event._id}`;
  const shareText = `Check out this event: ${event.title}`;
  
  const shareOptions = [
    {
      id: 'copy',
      icon: <FaLink className="w-4 h-4" />,
      label: 'Copy link',
      action: async () => {
        try {
          const { copyToClipboard } = await import('../../utils/browserCompatibility.js');
          const success = await copyToClipboard(shareUrl);
          if (success) {
            toast.success('Link copied to clipboard!');
            setShowShareOptions(false);
          } else {
            toast.error('Failed to copy link. Please copy manually.');
          }
        } catch (err) {
          console.error('Failed to copy:', err);
          toast.error('Failed to copy link');
        }
      }
    },
    {
      id: 'facebook',
      icon: <FaFacebook className="text-blue-600 w-4 h-4" />,
      label: 'Share on Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      id: 'twitter',
      icon: <FaTwitter className="text-blue-400 w-4 h-4" />,
      label: 'Share on Twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    },
    {
      id: 'whatsapp',
      icon: <FaWhatsapp className="text-green-500 w-4 h-4" />,
      label: 'Share on WhatsApp',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    },
    {
      id: 'email',
      icon: <FaEnvelope className="text-gray-600 w-4 h-4" />,
      label: 'Share via Email',
      url: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
    }
  ];

  const handleShare = (option) => {
    if (option.action) {
      option.action();
    } else if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
      setShowShareOptions(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareOptions(!showShareOptions)}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 focus:outline-none"
        data-tooltip-id="share-tooltip"
        data-tooltip-content="Share"
      >
        <FaShare className="w-4 h-4" />
        <span className="text-xs">Share</span>
        <Tooltip id="share-tooltip" />
      </button>

      {showShareOptions && (
        <div 
          className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200"
          onMouseLeave={() => setShowShareOptions(false)}
        >
          <div className="py-1">
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleShare(option)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
