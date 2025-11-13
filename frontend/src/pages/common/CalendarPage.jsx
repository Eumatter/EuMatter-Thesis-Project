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
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                <div className="mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center px-3 py-2 rounded-lg text-sm text-[#800000] hover:bg-[#800000]/10"
                        aria-label="Go back"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-md p-5">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => navigateMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50" aria-label="Previous month">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="text-lg font-semibold text-black">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => navigateMonth(1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50" aria-label="Next month">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (<div key={d}>{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-sm">
                        {getDays().map((d, i) => (
                            <div key={i} className={`h-10 flex items-center justify-center rounded ${d ? (isToday(d) ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100') : ''}`}>
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


