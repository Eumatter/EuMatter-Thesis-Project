import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDonate, FaHeart, FaRegHeart, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import LoadingSpinner from '../LoadingSpinner';

const DonateButton = ({ eventId, onDonate, className = '' }) => {
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDonateForm, setShowDonateForm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setIsDonating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onDonate) {
        await onDonate(eventId, parseFloat(amount));
      }
      
      setIsSuccess(true);
      setAmount('');
      toast.success('Thank you for your generous donation! ❤️');
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setShowDonateForm(false);
      }, 3000);
    } catch (error) {
      console.error('Donation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to process donation. Please try again.');
    } finally {
      setIsDonating(false);
    }
  };

  const suggestedAmounts = [5, 10, 20, 50, 100];

  // Animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    },
    tap: { scale: 0.95 }
  };

  const formVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      marginTop: '1rem',
      transition: { 
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      marginTop: 0,
      transition: { 
        duration: 0.2,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-4">
        {!showDonateForm ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDonateForm(true)}
          className={`w-full py-3 px-6 rounded-lg flex items-center justify-center space-x-2 ${
            isSuccess 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
          } transition-all duration-300 shadow-sm`}
        >
          {isSuccess ? (
            <>
              <FaCheckCircle className="text-green-500 text-xl" />
              <span>Donation Successful!</span>
            </>
          ) : (
            <>
            >
              <h3 className="text-lg font-medium text-gray-800">Support This Event</h3>
              <div className="grid grid-cols-5 gap-2 mb-4 mt-3">
                {suggestedAmounts.map((suggestedAmount) => (
                  <motion.button
                    key={suggestedAmount}
                    type="button"
                    onClick={() => setAmount(suggestedAmount.toString())}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-2 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      amount === suggestedAmount.toString()
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    ₱{suggestedAmount}
                  </motion.button>
                ))}
              </div>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Donation Amount (₱)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">₱</span>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    step="1"
                    disabled={isDonating}
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDonateForm(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isDonating}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  onClick={handleDonate}
                  disabled={isDonating || !amount}
                  className={`flex-1 py-2 px-4 rounded-md text-white flex items-center justify-center space-x-2 ${
                    isDonating || !amount
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isDonating ? (
                    <>
                      <LoadingSpinner size="tiny" inline />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaRegCreditCard />
                      <span>Donate ₱{amount || '0'}</span>
                    </>
                  )}
                </motion.button>
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                <p>Secure payment processed by our payment partner</p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DonateButton;
