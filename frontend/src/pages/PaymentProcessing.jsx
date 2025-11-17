import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { AppContent } from '../context/AppContext.jsx';
import axios from 'axios';

const PaymentProcessing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { backendUrl, userData, isLoading } = useContext(AppContent);
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState('processing');
  const [retryCount, setRetryCount] = useState(0);
  const pollingIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const donationId = searchParams.get('donationId');
  const sourceIdParam = searchParams.get('sourceId');

  // Polling configuration
  const MAX_RETRIES = 20; // Maximum number of retry attempts
  const POLL_INTERVAL = 3000; // 3 seconds between retries
  const MAX_TIMEOUT = 60000; // 60 seconds total timeout

  useEffect(() => {
    let resolvedSourceId = sourceIdParam;
    let isMounted = true;

    const verifyPayment = async (sourceId, donationId, attemptNumber = 0) => {
      try {
        console.log(`🔍 Verifying payment (attempt ${attemptNumber + 1}):`, { sourceId, donationId });

        const response = await axios.post(
          `${backendUrl}api/donations/confirm-source`,
          { sourceId, donationId },
          { withCredentials: true }
        );

        console.log('✅ Verification response:', response.data);

        if (response.data.success) {
          const donation = response.data.donation;

          if (donation.status === 'succeeded') {
            if (isMounted) {
              setStatus('success');
              setProcessing(false);
              toast.success('Payment successful! Thank you for your donation.');
              // Clear polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }
            return true; // Payment succeeded
          } else if (donation.status === 'failed') {
            if (isMounted) {
              setStatus('failed');
              setProcessing(false);
              toast.error('Payment failed. Please try again.');
              // Clear polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }
            return true; // Payment failed (definitive result)
          } else {
            // Still pending - will retry
            console.log(`⏳ Payment still pending (status: ${donation.status}), will retry...`);
            return false; // Still processing
          }
        } else {
          console.warn('⚠️ Verification returned success:false');
          return false;
        }
      } catch (error) {
        console.error('❌ Payment verification error:', error);
        // Don't stop polling on network errors, but stop on other errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          // Client error - stop polling
          if (isMounted) {
            setStatus('error');
            setProcessing(false);
            toast.error('Unable to verify payment status.');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
          return true; // Stop polling
        }
        return false; // Continue polling on network errors
      }
    };

    const startVerification = async () => {
      try {
        let idToUse = donationId;

        if (!idToUse) {
          toast.error('Missing donation ID.');
          setStatus('error');
          setProcessing(false);
          return;
        }

        // 🔍 If sourceId is missing, fetch from backend
        if (!resolvedSourceId) {
          try {
            const donationRes = await axios.get(
              `${backendUrl}api/donations/${idToUse}`,
              { withCredentials: true }
            );
            if (donationRes.data?.success) {
              resolvedSourceId = donationRes.data.donation.paymongoReferenceId;
              console.log('💡 Retrieved sourceId from backend:', resolvedSourceId);
            }
          } catch (error) {
            console.error('Error fetching donation:', error);
          }
        }

        if (!resolvedSourceId) {
          toast.error('Missing source ID — cannot verify payment.');
          setStatus('error');
          setProcessing(false);
          return;
        }

        // Set timeout to stop polling after MAX_TIMEOUT
        timeoutRef.current = setTimeout(() => {
          if (isMounted) {
            console.warn('⏰ Verification timeout reached');
            setStatus('error');
            setProcessing(false);
            toast.warn('Payment verification is taking longer than expected. Please check your donation history.');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, MAX_TIMEOUT);

        // First verification attempt
        const firstResult = await verifyPayment(resolvedSourceId, idToUse, 0);
        
        if (firstResult) {
          // Got definitive result, stop
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }

        // Start polling if still pending
        let currentRetry = 0;
        pollingIntervalRef.current = setInterval(async () => {
          if (!isMounted) {
            clearInterval(pollingIntervalRef.current);
            return;
          }

          currentRetry++;
          setRetryCount(currentRetry);

          if (currentRetry >= MAX_RETRIES) {
            console.warn('⏰ Maximum retries reached');
            if (isMounted) {
              setStatus('error');
              setProcessing(false);
              toast.warn('Payment verification is taking longer than expected. Please check your donation history.');
            }
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            return;
          }

          const result = await verifyPayment(resolvedSourceId, idToUse, currentRetry);
          if (result) {
            // Got definitive result, stop polling
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        }, POLL_INTERVAL);

      } catch (error) {
        console.error('❌ Initial verification error:', error);
        if (isMounted) {
          setStatus('error');
          setProcessing(false);
          toast.error('Error starting payment verification.');
        }
      }
    };

    // Small delay for context/cookies
    const timer = setTimeout(startVerification, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [donationId, sourceIdParam, backendUrl]);

  const handleContinue = () => {
    if (userData?.role === 'User') navigate('/user/dashboard');
    else navigate('/');
  };

  const handleRetry = () => navigate('/donate');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <LoadingSpinner size="large" text="Initializing payment processing..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {processing && status === 'processing' && (
          <>
            <LoadingSpinner size="large" text="Processing Payment..." />
            <p className="text-gray-600 mt-4">
              Please wait while we confirm your payment...
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Verifying... (attempt {retryCount + 1})
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your donation. Your payment has been processed successfully.
            </p>
            <button
              onClick={handleContinue}
              className="bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors"
            >
              Continue
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">
              Your payment could not be processed. Please try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleContinue}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-yellow-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Status Unknown</h2>
            <p className="text-gray-600 mb-6">
              We’re having trouble confirming your payment. Please check your donation history or contact support.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/donations')}
                className="w-full bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors"
              >
                Check Donation History
              </button>
              <button
                onClick={handleContinue}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentProcessing;
