import React, { useState, useContext } from 'react'
import { AppContent } from '../../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const SystemConfig = () => {
    const { backendUrl } = useContext(AppContent)
    const [configs, setConfigs] = useState({})

    React.useEffect(() => {
        axios.get(backendUrl + 'api/config')
            .then(res => setConfigs(res.data.configs || {}))
            .catch(() => { })
    }, [backendUrl])

    const handleUpdate = async (e) => {
        e.preventDefault()
        try {
            const res = await axios.put(backendUrl + 'api/config', configs)
            if (res.data.success) {
                toast.success('System configuration updated!')
            } else {
                toast.error(res.data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Error updating config')
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">System Configurations</h1>
            <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow p-6 space-y-4">
                <div>
                    <label className="block mb-2">Site Name</label>
                    <input
                        type="text"
                        value={configs.siteName || ''}
                        onChange={e => setConfigs({ ...configs, siteName: e.target.value })}
                        className="w-full border rounded px-4 py-2"
                    />
                </div>
                <div>
                    <label className="block mb-2">Contact Email</label>
                    <input
                        type="email"
                        value={configs.contactEmail || ''}
                        onChange={e => setConfigs({ ...configs, contactEmail: e.target.value })}
                        className="w-full border rounded px-4 py-2"
                    />
                </div>
                {/* Add more config fields as needed */}
                <button type="submit" className="w-full bg-green-900 text-white py-2 rounded-lg hover:bg-green-800">
                    Save Configurations
                </button>
            </form>
        </div>
    )
}

export default SystemConfig