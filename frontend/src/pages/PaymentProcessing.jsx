import React, { useEffect, useState, useContext } from 'react';
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

  const donationId = searchParams.get('donationId');
  let sourceId = searchParams.get('sourceId');

  useEffect(() => {
    const processPayment = async () => {
      try {
        let idToUse = donationId;

        if (!idToUse) {
          toast.error('Missing donation ID.');
          setStatus('error');
          setProcessing(false);
          return;
        }

        // 🔍 If sourceId is missing, fetch from backend
        if (!sourceId) {
          const donationRes = await axios.get(
            `${backendUrl}api/donations/${idToUse}`,
            { withCredentials: true }
          );
          if (donationRes.data?.success) {
            sourceId = donationRes.data.donation.paymongoReferenceId;
            console.log('💡 Retrieved sourceId from backend:', sourceId);
          }
        }

        if (!sourceId) {
          toast.error('Missing source ID — cannot verify payment.');
          setStatus('error');
          setProcessing(false);
          return;
        }

        console.log('🔍 Confirming PayMongo source:', sourceId);

        // ✅ Confirm payment on backend
        const response = await axios.post(
          `${backendUrl}api/donations/confirm-source`,
          { sourceId, donationId: idToUse },
          { withCredentials: true }
        );

        console.log('✅ Confirm source response:', response.data);

        if (response.data.success) {
          const donation = response.data.donation;

          if (donation.status === 'succeeded') {
            setStatus('success');
            toast.success('Payment successful! Thank you for your donation.');
          } else if (donation.status === 'failed') {
            setStatus('failed');
            toast.error('Payment failed. Please try again.');
          } else {
            setStatus('processing');
            toast.info('Payment is still processing...');
          }
        } else {
          setStatus('error');
          toast.error('Unable to verify payment status.');
        }
      } catch (error) {
        console.error('❌ Payment confirmation error:', error);
        toast.error('Error confirming payment.');
        setStatus('error');
      } finally {
        setProcessing(false);
      }
    };

    // Small delay for context/cookies
    const timer = setTimeout(processPayment, 1000);
    return () => clearTimeout(timer);
  }, [donationId, sourceId, backendUrl, navigate]);

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
