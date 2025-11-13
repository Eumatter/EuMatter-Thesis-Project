import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-6xl font-bold text-gray-900 mb-2">403</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Access Forbidden</h2>
            <p className="text-gray-600 mb-8">
              You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              to="/"
              className="inline-block bg-red-900 text-white px-8 py-3 rounded-lg hover:bg-red-800 transition-colors duration-200 font-medium"
            >
              Go Home
            </Link>
            <div className="text-sm text-gray-500">
              <button
                onClick={() => window.history.back()}
                className="text-red-600 hover:text-red-800 transition-colors duration-200"
              >
                ← Go Back
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
