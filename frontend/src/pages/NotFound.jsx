import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
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


