import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

const AuditLogTable = ({ 
    logs, 
    isLoading, 
    pagination, 
    onPageChange, 
    onSort,
    sortField,
    sortDirection
}) => {
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (logId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedRows(newExpanded);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            Critical: 'bg-red-50 text-red-700',
            High: 'bg-amber-50 text-amber-700',
            Medium: 'bg-amber-50 text-amber-700',
            Low: 'bg-blue-50 text-blue-700'
        };
        return colors[priority] || colors.Medium;
    };

    const getStatusBadge = (success) => {
        return success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
    };

    const handleSort = (field) => {
        if (onSort) {
            onSort(field);
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === 'asc' ? (
            <ChevronUpIcon className="w-4 h-4 ml-1 text-[#800000]" />
        ) : (
            <ChevronDownIcon className="w-4 h-4 ml-1 text-[#800000]" />
        );
    };

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No audit logs found</p>
            </div>
        );
    }

    return (
        <div className="-mx-4 sm:mx-0">
            <div className="inline-block w-full align-middle">
                <div className="overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors w-[18%]"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    <div className="flex items-center gap-1">
                                        Timestamp
                                        <SortIcon field="timestamp" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors w-[15%]"
                                    onClick={() => handleSort('userEmail')}
                                >
                                    <div className="flex items-center gap-1">
                                        User
                                        <SortIcon field="userEmail" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors w-[20%]"
                                    onClick={() => handleSort('actionType')}
                                >
                                    <div className="flex items-center gap-1">
                                        Action
                                        <SortIcon field="actionType" />
                                    </div>
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Category</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Status</th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors w-[10%]"
                                    onClick={() => handleSort('priority')}
                                >
                                    <div className="flex items-center gap-1">
                                        Priority
                                        <SortIcon field="priority" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <React.Fragment key={log._id}>
                                    <tr 
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => toggleRow(log._id)}
                                        title={expandedRows.has(log._id) ? 'Click to hide details' : 'Click to show details'}
                                    >
                                        <td className="px-3 py-3.5 text-sm text-gray-900">
                                            <div className="font-medium truncate" title={formatDate(log.timestamp)}>{formatDate(log.timestamp)}</div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm">
                                            <div className="font-medium text-gray-900 truncate" title={log.userName || log.userEmail || 'System'}>
                                                {log.userName || log.userEmail || 'System'}
                                            </div>
                                            {log.userRole && (
                                                <div className="text-xs text-gray-500 truncate" title={log.userRole}>
                                                    {log.userRole}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-gray-900">
                                            <div className="truncate font-medium" title={log.actionType}>
                                                {log.actionType || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-gray-700">
                                            <div className="truncate" title={log.category}>
                                                {log.category || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg ${getStatusBadge(log.success)}`}>
                                                {log.success ? 'Success' : 'Failure'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {log.priority ? (
                                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg ${getPriorityBadge(log.priority)}`}>
                                                        {log.priority}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                                <div className="ml-auto">
                                                    {expandedRows.has(log._id) ? (
                                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(log._id) && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-4 bg-gray-50/80 border-t border-gray-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Request Details</h4>
                                                <div className="space-y-1 text-gray-600">
                                                    {log.requestMethod && (
                                                        <div><span className="font-medium">Method:</span> {log.requestMethod}</div>
                                                    )}
                                                    {log.requestEndpoint && (
                                                        <div><span className="font-medium">Endpoint:</span> <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-lg font-mono">{log.requestEndpoint}</code></div>
                                                    )}
                                                    {log.responseStatus && (
                                                        <div><span className="font-medium">Status Code:</span> {log.responseStatus}</div>
                                                    )}
                                                    {log.sessionId && (
                                                        <div><span className="font-medium">Session ID:</span> <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-lg font-mono">{log.sessionId.substring(0, 20)}...</code></div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                                                <div className="space-y-1 text-gray-600">
                                                    {log.resourceType && (
                                                        <div>
                                                            <span className="font-medium">Resource Type:</span> {log.resourceType}
                                                            {log.resourceId && (
                                                                <span className="ml-2 text-xs text-gray-500" title={log.resourceId}>
                                                                    (ID: {log.resourceId.toString().substring(0, 12)}...)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {log.ipAddress && (
                                                        <div>
                                                            <span className="font-medium">IP Address:</span> <span className="font-mono text-xs">{log.ipAddress}</span>
                                                        </div>
                                                    )}
                                                    {log.userAgent && (
                                                        <div className="text-xs break-all"><span className="font-medium">User Agent:</span> {log.userAgent}</div>
                                                    )}
                                                    {log.location && (
                                                        <div><span className="font-medium">Location:</span> {[log.location.city, log.location.region, log.location.country].filter(Boolean).join(', ') || 'N/A'}</div>
                                                    )}
                                                    {log.errorMessage && (
                                                        <div className="text-red-600"><span className="font-medium">Error:</span> {log.errorMessage}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {(log.previousValues || log.newValues) && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Changes</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {log.previousValues && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">Previous Values:</div>
                                                                <pre className="text-xs bg-gray-100 p-3 rounded-xl overflow-auto max-h-32 border border-gray-100">
                                                                    {JSON.stringify(log.previousValues, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.newValues && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">New Values:</div>
                                                                <pre className="text-xs bg-gray-100 p-3 rounded-xl overflow-auto max-h-32 border border-gray-100">
                                                                    {JSON.stringify(log.newValues, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {log.requestPayload && Object.keys(log.requestPayload).length > 0 && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Request Payload</h4>
                                                    <pre className="text-xs bg-gray-100 p-3 rounded-xl overflow-auto max-h-32 border border-gray-100">
                                                        {JSON.stringify(log.requestPayload, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Metadata</h4>
                                                    <pre className="text-xs bg-gray-100 p-3 rounded-xl overflow-auto max-h-32 border border-gray-100">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 sm:px-6">
                    {/* Mobile Pagination */}
                    <div className="flex-1 flex justify-between items-center w-full sm:hidden">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-xl transition-colors ${
                                pagination.page === 1 ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <ChevronLeftIcon className="w-4 h-4 mr-1" />
                            Previous
                        </button>
                        <div className="text-sm text-gray-700">
                            Page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span>
                        </div>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-xl transition-colors ${
                                pagination.page === pagination.totalPages ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Next
                            <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                    
                    {/* Desktop Pagination */}
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-semibold text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                <span className="font-semibold text-gray-900">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{' '}
                                of <span className="font-semibold text-gray-900">{pagination.total}</span> results
                            </p>
                        </div>
                        <nav className="inline-flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm" aria-label="Pagination">
                            <button
                                type="button"
                                onClick={() => onPageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className={`inline-flex items-center px-3 py-2 border-r border-gray-200 text-sm ${
                                    pagination.page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-[#800000]'
                                }`}
                                aria-label="Previous page"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 7) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 4) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 3) {
                                    pageNum = pagination.totalPages - 6 + i;
                                } else {
                                    pageNum = pagination.page - 3 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`inline-flex items-center justify-center min-w-[2.5rem] py-2 text-sm font-medium transition-colors ${
                                            pagination.page === pageNum ? 'bg-[#800000] text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-[#800000]'
                                        }`}
                                        aria-label={`Page ${pageNum}`}
                                        aria-current={pagination.page === pageNum ? 'page' : undefined}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => onPageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className={`inline-flex items-center px-3 py-2 border-l border-gray-200 text-sm ${
                                    pagination.page === pagination.totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-[#800000]'
                                }`}
                                aria-label="Next page"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </nav>
                    </div>
                </div>
            )}
            
            {/* Pagination Info for Mobile */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-2 text-center text-xs text-gray-500 sm:hidden border-t border-gray-100 bg-gray-50/50">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
            )}
        </div>
    );
};

export default AuditLogTable;

