import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContent } from '../context/AppContext.jsx'
import axios from 'axios'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, allowedRoles }) => {
    const navigate = useNavigate()
    const { backendUrl, isLoggedIn, userData, setUserData, setIsLoggedIn, getDashboardRoute, isLoading } = useContext(AppContent)
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

    useEffect(() => {
        // Only check auth if we haven't already and the app context is done loading
        if (!hasCheckedAuth && !isLoading) {
            const checkAuth = async () => {
                try {
                    axios.defaults.withCredentials = true
                    const { data } = await axios.get(backendUrl + 'api/auth/is-authenticated')
                    
                    if (data.success && data.user) {
                        setUserData(data.user)
                        setIsLoggedIn(true)
                        
                        // Check if account is verified - redirect to verification if not (ONLY for Users)
                        const rolesRequiringVerification = ['User'];
                        if (rolesRequiringVerification.includes(data.user.role) && !data.user.isAccountVerified) {
                            // Store email in sessionStorage for verification page (in case of refresh)
                            sessionStorage.setItem('verificationEmail', data.user.email.trim().toLowerCase())
                            
                            return navigate('/email-verify', { 
                                state: { email: data.user.email, fromProtectedRoute: true } 
                            })
                        }
                        
                        // If specific roles are required, check them
                        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
                            if (!allowedRoles.includes(data.user.role)) {
                                const dashboardRoute = getDashboardRoute(data.user.role)
                                return navigate(dashboardRoute)
                            }
                        }
                    } else {
                        // User not authenticated, stay on current page
                        setIsLoggedIn(false)
                        setUserData(null)
                    }
                } catch (error) {
                    // Authentication failed, stay on current page
                    setIsLoggedIn(false)
                    setUserData(null)
                } finally {
                    setHasCheckedAuth(true)
                }
            }

            checkAuth()
        }
    }, [backendUrl, setUserData, setIsLoggedIn, getDashboardRoute, navigate, isLoading, hasCheckedAuth, allowedRoles])

    // Show loading while app context is loading or while checking auth
    if (isLoading || !hasCheckedAuth) {
        return (
            <LoadingSpinner 
                fullScreen 
                size="large" 
                text="Loading..."
            />
        )
    }

    return children
}

export default ProtectedRoute
