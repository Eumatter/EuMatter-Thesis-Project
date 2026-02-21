import React, { useState } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useNavigate } from 'react-router-dom'

const CalendarPage = () => {
    const navigate = useNavigate()
    const [currentDate, setCurrentDate] = useState(new Date())

    const navigateMonth = (delta) => {
        const d = new Date(currentDate)
        d.setMonth(currentDate.getMonth() + delta)
        setCurrentDate(d)
    }

    const getDays = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPad = firstDay.getDay()
        const daysArr = []
        for (let i = 0; i < startPad; i++) daysArr.push(null)
        for (let d = 1; d <= lastDay.getDate(); d++) daysArr.push(d)
        return daysArr
    }

    const isToday = (day) => {
        const now = new Date()
        return day === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                        aria-label="Go back"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">Calendar</h1>
                    <p className="text-sm text-gray-600 mt-0.5">View and navigate by month.</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <button
                            type="button"
                            onClick={() => navigateMonth(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                            aria-label="Previous month"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button
                            type="button"
                            onClick={() => navigateMonth(1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                            aria-label="Next month"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-medium text-gray-500 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-sm">
                        {getDays().map((d, i) => (
                            <div
                                key={i}
                                className={`min-h-[44px] sm:min-h-[48px] flex items-center justify-center rounded-xl text-gray-700 transition ${
                                    !d
                                        ? ''
                                        : isToday(d)
                                            ? 'bg-[#800000] text-white font-semibold'
                                            : 'bg-gray-50 hover:bg-gray-100 font-medium'
                                }`}
                            >
                                {d || ''}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default CalendarPage


