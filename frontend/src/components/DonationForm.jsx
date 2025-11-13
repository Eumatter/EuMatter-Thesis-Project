import React, { useState, useContext } from 'react'
import axios from 'axios'
import LoadingSpinner from './LoadingSpinner'
import { AppContent } from '../context/AppContext.jsx'
import { notifyError, notifyInfo } from '../utils/notify'

const DonationForm = () => {
    const { backendUrl } = useContext(AppContent)
    const [form, setForm] = useState({
        donorName: '',
        donorEmail: '',
        amount: '',
        message: '',
        paymentMethod: 'gcash',
    })
    const [loading, setLoading] = useState(false)

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const createDonation = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(`${backendUrl}api/donations`, form)
            if (!data.success) throw new Error(data.message || 'Failed to create donation')

            if (data.type === 'source') {
                window.location.href = data.checkoutUrl
                return
            }

            if (data.type === 'payment_intent') {
                notifyInfo('Payment Processing', 'Card flow: collect card details and attach to intent')
                // In a real app, use PayMongo Elements or your PCI-compliant form to get paymentMethodId
                // Then call /api/donations/attach with { donationId, paymentMethodId }
            }
        } catch (err) {
            notifyError('Donation Failed', err?.response?.data?.message || err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Donate</h2>
            <form onSubmit={createDonation} className="space-y-3">
                <input name="donorName" value={form.donorName} onChange={onChange} placeholder="Full name" className="w-full border p-2" required />
                <input type="email" name="donorEmail" value={form.donorEmail} onChange={onChange} placeholder="Email" className="w-full border p-2" required />
                <input type="number" min="1" step="0.01" name="amount" value={form.amount} onChange={onChange} placeholder="Amount (PHP)" className="w-full border p-2" required />
                <textarea name="message" value={form.message} onChange={onChange} placeholder="Message (optional)" className="w-full border p-2" />
                <select name="paymentMethod" value={form.paymentMethod} onChange={onChange} className="w-full border p-2">
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="card">Debit/Credit Card</option>
                    <option value="bank">Bank Transfer</option>
                </select>
                <button 
                    disabled={loading} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <LoadingSpinner size="tiny" inline />
                            <span>Processing…</span>
                        </>
                    ) : (
                        'Donate'
                    )}
                </button>
            </form>
        </div>
    )
}

export default DonationForm


